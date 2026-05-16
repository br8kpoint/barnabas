import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { consumeEmailOtp } from "@/lib/email-otp";

async function ensureSupabaseUser(
  email: string,
  displayName: string | null,
): Promise<string> {
  const supabase = getAdminSupabase();
  const normalized = email.toLowerCase();

  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (data.users.length < 1000) break;
    page += 1;
  }

  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
      user_metadata: displayName ? { full_name: displayName } : {},
    });
  if (createErr || !created.user) {
    throw createErr ?? new Error("Failed to create user");
  }
  return created.user.id;
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Google,
    MicrosoftEntraID,
    GitHub,
    Credentials({
      id: "email-otp",
      name: "Email code",
      credentials: {
        email: { type: "email" },
        code: { type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const code = String(credentials?.code ?? "").trim();
        if (!email || !/^\d{6}$/.test(code)) return null;
        const ok = await consumeEmailOtp(email, code);
        if (!ok) return null;
        return { email, name: null };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return Boolean(user?.email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        token.sub = await ensureSupabaseUser(user.email, user.name ?? null);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (typeof token.email === "string") session.user.email = token.email;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
