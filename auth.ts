import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

class AccountLocked extends CredentialsSignin {
  code = "locked";
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findFirst({ where: { email, deletedAt: null, isActive: true } });
        if (!user?.passwordHash) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) throw new AccountLocked();

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          const failed = user.failedLoginCount + 1;
          const lock = failed >= MAX_FAILED_ATTEMPTS;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: lock ? 0 : failed,
              lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
            },
          });
          if (lock) throw new AccountLocked();
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
