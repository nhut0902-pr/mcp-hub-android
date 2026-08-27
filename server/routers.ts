import { COOKIE_NAME } from "../shared/const.js";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { forwardProviderChat } from "./chat-proxy";
import { listAiCloudModels, sendAiCloudChat } from "./ai-cloud";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  chat: router({
    send: publicProcedure.input(z.object({
      apiBaseUrl: z.string().url(),
      apiKey: z.string().min(1).max(1024),
      providerKind: z.enum(["nvidia", "groq", "openrouter", "anthropic", "gemini", "openai", "openclaw", "custom"]).optional(),
      payload: z.record(z.string(), z.unknown()),
    })).mutation(({ input }) => forwardProviderChat(input)),
  }),
  aiCloud: router({
    models: publicProcedure.query(() => listAiCloudModels()),
    send: publicProcedure.input(z.object({ payload: z.record(z.string(), z.unknown()) })).mutation(({ input }) => sendAiCloudChat(input.payload)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
