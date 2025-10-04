import Auth0 from "@auth/core/providers/auth0";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Auth0({
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      issuer: `https://${process.env.AUTH0_DOMAIN}`,
    }),
  ],
});
