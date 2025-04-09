import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  //   callbacks: {
  //     async signIn({ account, profile }) {
  //       if (account.provider === "google") {
  //         return profile.email_verified && profile.email.endsWith("@example.com");
  //       }
  //       return true; // Do different verification for other providers that don't have `email_verified`
  //     },
  //   },
});
