import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type AuthedUser = { id: string; email: string; name?: string | null };

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  };
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
