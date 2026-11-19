import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { UserService } from '../db/Auth/auth-service';

import {

  LAB_SESSION_COOKIE,

  LabSessionService,

} from '../auth/lab-session-service';

import { toPublicUser } from '@/shared/utils/public-user';

import { requirePlatformHttpUser } from '../middleware/platform-http-auth';

import { oidcProviderService } from '../db/OidcProviders/oidc-provider-service';
import {
  createOidcLoginRedirectUrl,
  handleOidcProviderCallback,
  isOidcProviderLoginReady,
  oidcProviderNotConfiguredMessage,
} from '../auth/lab-oidc-flow';
import { isKnownOidcProviderId } from '@/shared/config/lab-oidc-provider-catalog';

import {
  attachLabSessionToReply,

  buildFrontendSsoCompleteUrl,

} from '../auth/http-auth-session';



interface LoginBody {

  username: string;

  password: string;

}



interface ChangePasswordBody {

  currentPassword: string;

  newPassword: string;

}



export function registerHttpAuthRoutes(server: FastifyInstance): void {

  server.get('/auth/oidc/config', async (_request, reply: FastifyReply) => {
    const providers = oidcProviderService.getProviderFlags();
    const enabledProviderIds = oidcProviderService.getEnabledProviderIds();

    return reply.send({
      providers,
      enabledProviderIds,
    });
  });



  server.post(

    '/auth/login',

    {

      schema: {

        body: {

          type: 'object',

          required: ['username', 'password'],

          properties: {

            username: { type: 'string' },

            password: { type: 'string' },

          },

        },

      },

    },

    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {

      const user = await UserService.getInstance().authenticateUser(

        request.body.username,

        request.body.password,

      );

      if (!user) {

        return reply.status(401).send({ success: false, error: 'Invalid credentials' });

      }

      const session = attachLabSessionToReply(reply, user.userId, {
        io: server.io,
        authMethod: 'password',
      });

      return reply.send({

        success: true,

        userId: user.userId,

        accessToken: session.accessToken,

        labSessionId: session.sessionId,

        mustChangePassword: Boolean(user.mustChangePassword),

        user: toPublicUser(user),

      });

    },

  );



  server.post(

    '/auth/change-password',

    {

      schema: {

        body: {

          type: 'object',

          required: ['currentPassword', 'newPassword'],

          properties: {

            currentPassword: { type: 'string' },

            newPassword: { type: 'string', minLength: 8 },

          },

        },

      },

    },

    async (

      request: FastifyRequest<{ Body: ChangePasswordBody }>,

      reply: FastifyReply,

    ) => {

      const labUser = await requirePlatformHttpUser(request, reply, {

        allowPasswordChangeRequired: true,

      });

      if (!labUser) {

        return;

      }

      const result = await UserService.getInstance().changeUserPassword(

        labUser.userId,

        request.body.currentPassword,

        request.body.newPassword,

      );

      if (!result.success) {

        return reply.status(400).send({ success: false, error: result.error });

      }

      return reply.send({

        success: true,

        mustChangePassword: false,

        user: result.user ? toPublicUser(result.user) : undefined,

      });

    },

  );



  server.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {

    const cookie = request.headers.cookie ?? '';

    const match = cookie.split(';').find((c) => c.trim().startsWith(`${LAB_SESSION_COOKIE}=`));

    if (match) {

      const sessionId = decodeURIComponent(match.split('=').slice(1).join('='));

      LabSessionService.getInstance().revokeSession(sessionId);

    }

    reply.clearCookie(LAB_SESSION_COOKIE, { path: '/' });

    return reply.send({ success: true });

  });



  server.get('/auth/oidc/google/login', async (_request, reply: FastifyReply) => {
    return handleOidcLoginRequest(reply, 'google');
  });

  server.get(
    '/auth/oidc/google/callback',
    async (
      request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string } }>,
      reply: FastifyReply,
    ) => {
      return handleOidcCallbackRequest(reply, 'google', request.query);
    },
  );

  server.get(
    '/auth/oidc/:provider/login',
    async (request: FastifyRequest<{ Params: { provider: string } }>, reply: FastifyReply) => {
      const provider = request.params.provider.trim().toLowerCase();
      if (provider === 'google') {
        return reply.redirect('/auth/oidc/google/login');
      }
      return handleOidcLoginRequest(reply, provider);
    },
  );

  server.get(
    '/auth/oidc/:provider/callback',
    async (
      request: FastifyRequest<{
        Params: { provider: string };
        Querystring: { code?: string; state?: string; error?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const provider = request.params.provider.trim().toLowerCase();
      if (provider === 'google') {
        return reply.redirect(
          `/auth/oidc/google/callback?${new URLSearchParams(
            request.query as Record<string, string>,
          ).toString()}`,
        );
      }
      return handleOidcCallbackRequest(reply, provider, request.query);
    },
  );
}

type OidcCallbackQuery = { code?: string; state?: string; error?: string };

function handleOidcLoginRequest(reply: FastifyReply, providerId: string) {
  if (!isKnownOidcProviderId(providerId) || !isOidcProviderLoginReady(providerId)) {
    return reply.status(501).send({
      success: false,
      error: oidcProviderNotConfiguredMessage(providerId),
      doc: 'docs/auth/oidc-jit-phase1.md',
    });
  }
  try {
    const url = createOidcLoginRedirectUrl(providerId);
    return reply.redirect(url);
  } catch (err) {
    return reply.status(500).send({
      success: false,
      error: err instanceof Error ? err.message : 'OIDC login failed',
    });
  }
}

async function handleOidcCallbackRequest(
  reply: FastifyReply,
  providerId: string,
  query: OidcCallbackQuery,
) {
  if (query.error) {
    return reply.status(400).send({ success: false, error: query.error });
  }
  if (!isKnownOidcProviderId(providerId)) {
    return reply.status(501).send({
      success: false,
      error: `OIDC provider "${providerId}" is not supported`,
    });
  }
  try {
    const { userId } = await handleOidcProviderCallback(
      providerId,
      query.code,
      query.state,
    );
    const session = attachLabSessionToReply(reply, userId, {
      io: server.io,
      authMethod: 'oidc',
      providerKey: providerId,
    });
    const redirectUrl = buildFrontendSsoCompleteUrl({
      userId,
      labSessionId: session.sessionId,
      accessToken: session.accessToken,
    });
    return reply.redirect(redirectUrl);
  } catch (err) {
    return reply.status(400).send({
      success: false,
      error: err instanceof Error ? err.message : 'Sign-in failed',
    });
  }
}

