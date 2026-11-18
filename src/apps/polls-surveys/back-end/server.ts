/** Polls & Surveys server — REST API over the app's SQLite DB. */
import { z } from 'zod';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapPollsTables, PollsRepository } from './polls-repository';
import type {
  CastVoteInput,
  Poll,
  PollOption,
  PollStatus,
  UpsertOptionInput,
  UpsertPollInput,
} from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogPositiveInt, catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { pollsDemoAdapter } from './db/seed-polls-demo';
import { emitPollStatusDomainEvents } from './poll-domain-events';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { grantLabActivityQuarkReward } from '@/shared/server/grant-lab-activity-quark-reward.node';
import { labActivityQuarkSourceRef } from '@/shared/types/lab-virtual-bank';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4124;

const KindSchema = z.enum(['single', 'multi']);
const StatusSchema = z.enum(['draft', 'open', 'closed']);

const PollSchema = z.object({
  question: z.string().min(1),
  kind: KindSchema.default('single'),
  status: StatusSchema.default('draft'),
  allowAnonymous: z.coerce.boolean().default(true),
  allowMultipleVotes: z.coerce.boolean().default(true),
});

const StatusOnlySchema = z.object({ status: StatusSchema });

const OptionSchema = z.object({
  pollId: catalogPositiveInt,
  label: z.string().min(1),
});

const OptionUpdateSchema = OptionSchema.omit({ pollId: true });

const VoteSchema = z.object({
  pollId: catalogPositiveInt,
  optionId: catalogPositiveInt,
  voter: z.string().default(''),
});

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapPollsTables(db);
  runDemoSeedOnBoot(db, 'app-polls-surveys', pollsDemoAdapter);
  const repo = new PollsRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-polls-surveys',
    healthExtras: () => ({ app: 'polls-surveys' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/polls', async (request) => {
        const voter =
          typeof (request.query as { voter?: string }).voter === 'string'
            ? (request.query as { voter: string }).voter
            : '';
        const viewer = {
          voter,
          voterId: resolveLabAppActorUserId(request),
        };
        return { polls: repo.list(viewer) };
      });

      server.post('/api/polls', async (request, reply) => {
        const parsed = PollSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const poll = repo.createPoll(parsed.data as UpsertPollInput);
        await emitPollStatusDomainEvents(request, repo, null, poll);
        return reply.send({ poll });
      });

      server.patch('/api/polls/:id/status', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = StatusOnlySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const before = repo.getPoll(id);
        const poll = repo.setStatus(id, parsed.data.status as PollStatus);
        if (!poll) return reply.status(404).send({ error: 'Poll not found' });

        await emitPollStatusDomainEvents(request, repo, before, poll);

        return reply.send({ poll });
      });

      server.delete('/api/polls/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deletePoll(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/poll-options', async (request, reply) => {
        const parsed = OptionSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ option: repo.addOption(parsed.data as UpsertOptionInput) });
      });

      server.delete('/api/poll-options/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteOption(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/poll-votes', async (request, reply) => {
        const parsed = VoteSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const result = repo.castVote({
          ...(parsed.data as CastVoteInput),
          voterId: resolveLabAppActorUserId(request),
        });
        if (!result.ok) return reply.status(400).send({ error: result.error });
        const userId = resolveLabAppActorUserId(request);
        const quarksRewarded =
          userId != null
            ? await grantLabActivityQuarkReward({
                kind: 'pollVote',
                userId,
                sourceAppId: 'app-polls-surveys',
                sourceRef: labActivityQuarkSourceRef('pollVote', {
                  pollId: parsed.data.pollId,
                  userId,
                }),
                reasonLabel: 'Poll response submitted',
              })
            : 0;
        return reply.send({ success: true, quarksRewarded });
      });

      const parsePoll = catalogZodParse(PollSchema);
      const parseOption = catalogZodParse(OptionSchema);
      const parseOptionUpdate = catalogZodParse(OptionUpdateSchema);
      const flatOptions = (): PollOption[] => repo.list().flatMap((poll) => poll.options);

      await registerCatalogConnectors(server, 'app-polls-surveys', {
        polls: {
          list: () =>
            repo.list().map((row) => {
              const { options, totalVotes, ...poll } = row;
              void options;
              void totalVotes;
              return poll;
            }),
          getById: (id) => repo.getPoll(coerceConnectorNumericId(id)),
          parseCreate: parsePoll,
          parseUpdate: parsePoll,
          create: async (body, request) => {
            const poll = repo.createPoll(body as UpsertPollInput);
            if (request) {
              await emitPollStatusDomainEvents(request, repo, null, poll);
            }
            return poll;
          },
          update: async (id, body, request) => {
            const numId = coerceConnectorNumericId(id);
            const before = repo.getPoll(numId);
            const poll = repo.updatePoll(numId, body as UpsertPollInput);
            if (poll && request) {
              await emitPollStatusDomainEvents(request, repo, before, poll);
            }
            return poll;
          },
          delete: (id) => repo.deletePoll(coerceConnectorNumericId(id)),
          toConnector: (poll: Poll) => ({ ...poll }),
        },
        'poll-options': {
          list: flatOptions,
          getById: (id) => flatOptions().find((option) => option.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseOption,
          parseUpdate: parseOptionUpdate,
          create: (body) => repo.addOption(body as UpsertOptionInput),
          update: (id, body) => {
            const numId = coerceConnectorNumericId(id);
            const existing = flatOptions().find((option) => option.id === numId);
            if (!existing) return null;
            const data = parseOptionUpdate(body as Record<string, unknown>) as z.infer<typeof OptionUpdateSchema>;
            return repo.updateOption(numId, { pollId: existing.pollId, label: data.label });
          },
          delete: (id) => repo.deleteOption(coerceConnectorNumericId(id)),
          toConnector: (option: PollOption) => ({
            id: option.id,
            pollId: option.pollId,
            label: option.label,
            order: option.order,
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
