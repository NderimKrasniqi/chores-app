import {
  httpRouter,
} from 'convex/server';
import {
  httpAction,
} from './_generated/server';
import {
  internal,
} from './_generated/api';
import {
  hashEvidenceViewToken,
} from './lib/evidence/viewEvidence';

import { authComponent, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path:
    '/submission-evidence',

  method:
    'GET',

  handler:
    httpAction(
      async (
        ctx,
        request,
      ) => {
        const url =
          new URL(
            request.url,
          );

        const rawToken =
          url.searchParams
            .get(
              'token',
            );

        if (!rawToken) {
          return new Response(
            'Not found',
            {
              status:
                404,
            },
          );
        }

        const tokenHash =
          await hashEvidenceViewToken(
            rawToken,
          );

        const resolved =
          await ctx.runQuery(
            internal
              .submissionEvidence
              .resolveViewToken,
            {
              tokenHash,
            },
          );

        if (!resolved) {
          return new Response(
            'Not found',
            {
              status:
                404,
            },
          );
        }

        const blob =
          await ctx.storage.get(
            resolved
              .storageId,
          );

        if (!blob) {
          return new Response(
            'Not found',
            {
              status:
                404,
            },
          );
        }

        return new Response(
          blob,
          {
            status:
              200,

            headers: {
              'Content-Type':
                'image/jpeg',

              'Cache-Control':
                'private, no-store',

              'X-Content-Type-Options':
                'nosniff',
            },
          },
        );
      },
    ),
});

export default http;
