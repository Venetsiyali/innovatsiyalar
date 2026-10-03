import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { ROLE_HOME, roleForPath } from "@/lib/roles";

export const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours

// Edge-compatible part of the config, shared by middleware and auth.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.mustChangePassword = token.mustChangePassword;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;

      if (pathname === "/login" || pathname === "/") {
        if (role) return NextResponse.redirect(new URL(ROLE_HOME[role], request.nextUrl));
        return pathname === "/login" ? true : NextResponse.redirect(new URL("/login", request.nextUrl));
      }

      const required = roleForPath(pathname);
      if (!required) return true;
      if (!role) return false; // → redirect to /login
      if (role !== required) return NextResponse.redirect(new URL(ROLE_HOME[role], request.nextUrl));
      return true;
    },
  },
} satisfies NextAuthConfig;
