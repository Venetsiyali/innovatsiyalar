import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/", "/login", "/change-password", "/admin/:path*", "/teacher/:path*", "/student/:path*"],
};
