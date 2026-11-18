/** Knowledge Base server — REST API over the app's SQLite DB. */
import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { VSCodeLogger } from '@/backend/utils/logger';
import { createAppServer } from '@/shared/services/create-app-server';
import {
  getLabAppUserFromRequest,
  resolveLabAppActorUserId,
} from '@/shared/server/lab-app-http-auth';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { kbDemoAdapter } from './db/seed-kb-demo';
import { runKnowledgeBaseDocsSeedOnBoot } from './db/seed-kb-docs';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { ArticleRepository, bootstrapArticleTables } from './article-repository';
import type { Article, ArticleStatus, KbAgentView, UpsertArticleInput } from '../shared/types';
import { KNOWLEDGE_BASE_APP_REGISTRY_ID } from '../shared/constants/app-registry';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { runPersonColumnMigrations } from '@/shared/server/run-person-column-migrations';
import { catalogPersonColumnsFor } from '@/shared/config/catalog-person-columns';
import {
  labUserFieldSchema,
  resolveLabUserFieldValue,
} from '@/shared/server/lab-user-field-input';
import { resolvePlatformActorUserId } from '@/shared/services/platform-user-client.node';

/**
 * Platform apps use the low fixed port range. The registry row for `app-knowledge-base`
 * carries 3016 (`AppsRepository.ensureKnowledgeBasePlatformRegistration`), so the default
 * here must match — the app manager passes `PORT` in normal operation.
 */
const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 3016;

const StatusSchema = z.enum(['draft', 'published', 'archived']);

/** `agent_view` arrives as JSON text or as an object, depending on the caller. */
const AgentViewSchema = z.union([z.string(), z.record(z.string(), z.unknown())]).nullish();

const ArticleSchema = z.object({
  title: z.string().min(1),
  category: z.string().default(''),
  tags: z.string().default(''),
  body: z.string().default(''),
  status: StatusSchema.default('draft'),
  // Lookup controls submit a user id; the inline UI submits a name. Both accepted.
  author: labUserFieldSchema,
  authorId: z.number().int().positive().nullish(),
  slug: z.string().nullish(),
  agentView: AgentViewSchema,
  appId: z.string().nullish(),
  sourcePath: z.string().nullish(),
});

type ArticleBody = z.infer<typeof ArticleSchema>;

/** Normalise the three shapes a caller can use for `agent_view`. */
function resolveAgentViewInput(
  raw: string | Record<string, unknown> | null | undefined,
): KbAgentView | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === 'object') {
    return raw as unknown as KbAgentView;
  }
  const text = raw.trim();
  if (!text) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as KbAgentView) : null;
  } catch {
    throw new Error('agentView must be valid JSON');
  }
}

async function toArticleInput(
  body: ArticleBody,
  actorUserId: number,
): Promise<UpsertArticleInput> {
  const author = await resolveLabUserFieldValue(body.author, actorUserId, {
    fieldName: 'author',
  });
  return {
    title: body.title,
    category: body.category,
    tags: body.tags,
    body: body.body,
    status: body.status as ArticleStatus,
    author: author.name,
    authorId: body.authorId ?? author.userId ?? null,
    slug: body.slug ?? null,
    agentView: resolveAgentViewInput(body.agentView),
    appId: body.appId ?? null,
    sourcePath: body.sourcePath ?? null,
  };
}

function resolveConnectorActorUserId(request?: FastifyRequest): number {
  if (request) {
    const user = getLabAppUserFromRequest(request);
    if (user) {
      return user.labUserId;
    }
    return resolvePlatformActorUserId(request.headers['x-lab-user-id']);
  }
  return resolvePlatformActorUserId();
}

async function articleInputFromConnectorBody(
  body: ArticleBody,
  existing: Article | null,
  actorUserId: number,
): Promise<UpsertArticleInput> {
  const input = await toArticleInput(body, actorUserId);
  if (!existing) {
    return input;
  }
  const agentViewUnchanged = body.agentView === undefined;
  return {
    ...input,
    slug: body.slug !== undefined && body.slug !== null ? input.slug : existing.slug,
    agentView: agentViewUnchanged ? existing.agentView : input.agentView,
    appId: body.appId !== undefined && body.appId !== null ? input.appId : existing.appId,
    sourcePath:
      body.sourcePath !== undefined && body.sourcePath !== null
        ? input.sourcePath
        : existing.sourcePath,
  };
}

/**
 * There is no status route: publishing happens through `PUT /api/kb/articles/:id`, so the
 * transition to `published` is the only signal. Re-saving a published article stays silent.
 */
async function publishArticleContentUpdated(
  request: Parameters<typeof publishLabDomainEvent>[0],
  article: Article,
): Promise<void> {
  try {
    await publishLabDomainEvent(request, {
      schemaVersion: 1,
      id: randomUUID(),
      type: buildLabEventType('app-knowledge-base', 'article', 'content_updated'),
      sourceAppId: 'app-knowledge-base',
      occurredAt: new Date().toISOString(),
      actorUserId: resolveLabAppActorUserId(request),
      payload: {
        articleId: article.id,
        title: article.title,
        slug: article.slug ?? null,
        status: article.status,
      },
    });
  } catch (publishError: unknown) {
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[knowledge-base] lab-events content_updated skipped: ${
        publishError instanceof Error ? publishError.message : String(publishError)
      }`,
    );
  }
}

type KbIndexRemovalReason = 'archived' | 'draft' | 'deleted';

async function publishArticleIndexRemoved(
  request: Parameters<typeof publishLabDomainEvent>[0],
  article: Article,
  reason: KbIndexRemovalReason,
): Promise<void> {
  try {
    await publishLabDomainEvent(request, {
      schemaVersion: 1,
      id: randomUUID(),
      type: buildLabEventType('app-knowledge-base', 'article', 'index_removed'),
      sourceAppId: 'app-knowledge-base',
      occurredAt: new Date().toISOString(),
      actorUserId: resolveLabAppActorUserId(request),
      payload: {
        articleId: article.id,
        slug: article.slug ?? null,
        status: article.status,
        reason,
      },
    });
  } catch (publishError: unknown) {
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[knowledge-base] lab-events index_removed skipped: ${
        publishError instanceof Error ? publishError.message : String(publishError)
      }`,
    );
  }
}

async function publishArticlePublished(
  request: Parameters<typeof publishLabDomainEvent>[0],
  article: Article,
): Promise<void> {
  try {
    await publishLabDomainEvent(request, {
      schemaVersion: 1,
      id: randomUUID(),
      type: buildLabEventType('app-knowledge-base', 'article', 'published'),
      sourceAppId: 'app-knowledge-base',
      occurredAt: new Date().toISOString(),
      actorUserId: resolveLabAppActorUserId(request),
      payload: {
        articleId: article.id,
        title: article.title,
        category: article.category,
        status: article.status,
        author: article.author,
      },
    });
  } catch (publishError: unknown) {
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[knowledge-base] lab-events publish skipped: ${
        publishError instanceof Error ? publishError.message : String(publishError)
      }`,
    );
  }
}

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapArticleTables(db);
  await runPersonColumnMigrations(db, 'knowledge-base', [
    ...catalogPersonColumnsFor('app-knowledge-base'),
  ]);
  runDemoSeedOnBoot(db, KNOWLEDGE_BASE_APP_REGISTRY_ID, kbDemoAdapter);
  runKnowledgeBaseDocsSeedOnBoot(db);
  const repo = new ArticleRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    healthExtras: () => ({ app: 'knowledge-base' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {
      server.get('/api/kb/articles', async (request) => ({
        articles: repo.list((request.query as { search?: string }).search),
        categories: repo.categories(),
      }));

      server.post('/api/kb/articles', async (request, reply) => {
        const parsed = ArticleSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ article: repo.create(parsed.data as UpsertArticleInput) });
      });

      server.put('/api/kb/articles/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = ArticleSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const before = repo.getById(id);
        const article = repo.update(id, parsed.data as UpsertArticleInput);
        if (!article) return reply.status(404).send({ error: 'Article not found' });
        if (article.status === 'published') {
          await publishArticleContentUpdated(request, article);
        }
        if (before?.status !== 'published' && article.status === 'published') {
          await publishArticlePublished(request, article);
        }
        if (before?.status === 'published' && article.status !== 'published') {
          const reason: KbIndexRemovalReason =
            article.status === 'archived' ? 'archived' : 'draft';
          await publishArticleIndexRemoved(request, article, reason);
        }
        return reply.send({ article });
      });

      server.delete('/api/kb/articles/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const before = repo.getById(id);
        if (!before) {
          return reply.status(404).send({ success: false });
        }
        const deleted = repo.delete(id);
        if (!deleted) {
          return reply.status(404).send({ success: false });
        }
        await publishArticleIndexRemoved(request, before, 'deleted');
        return reply.send({ success: true });
      });

      const toConnector = (article: Article) => ({
        id: article.id,
        title: article.title,
        category: article.category,
        tags: article.tags,
        body: article.body,
        status: article.status,
        author: article.authorId ?? article.author,
        authorId: article.authorId,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      });

      const parseArticleBody = catalogZodParse(ArticleSchema);

      await registerCatalogConnectors(server, KNOWLEDGE_BASE_APP_REGISTRY_ID, {
        articles: {
          list: () => repo.list(),
          getById: (id) => repo.getById(typeof id === 'number' ? id : Number(id)),
          parseCreate: parseArticleBody,
          parseUpdate: parseArticleBody,
          create: async (body, request) =>
            repo.create(
              await articleInputFromConnectorBody(
                body as ArticleBody,
                null,
                resolveConnectorActorUserId(request),
              ),
            ),
          update: async (id, body, request) => {
            const numericId = typeof id === 'number' ? id : Number(id);
            const existing = repo.getById(numericId);
            if (!existing) {
              return null;
            }
            return repo.update(
              numericId,
              await articleInputFromConnectorBody(
                body as ArticleBody,
                existing,
                resolveConnectorActorUserId(request),
              ),
            );
          },
          delete: (id) => repo.delete(typeof id === 'number' ? id : Number(id)),
          toConnector,
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
