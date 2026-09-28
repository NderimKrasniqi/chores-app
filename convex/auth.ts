import { expo } from "@better-auth/expo";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { anonymous } from "better-auth/plugins";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,

    trustedOrigins: [
      "choresapp://",
      ...(process.env.APP_ENV === "development" ? ["exp://", "exp://**"] : []),
    ],

    database: authComponent.adapter(ctx),

    // Stay signed in on your own phone: a login lasts 90 days and renews
    // (at most once a day) whenever the app is used. Kids aren't forced to
    // re-pair after a quiet week.
    session: {
      expiresIn: 60 * 60 * 24 * 90,
      updateAge: 60 * 60 * 24,
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    plugins: [anonymous(), expo(), convex({ authConfig })],
  });
};
