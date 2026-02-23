import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "./schema";

export async function getUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function updateUser(id: string, data: { displayName?: string; avatarUrl?: string | null }) {
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function upsertUser(id: string, email: string, displayName: string) {
  await db
    .insert(users)
    .values({
      id,
      email,
      displayName,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        displayName,
        updatedAt: new Date(),
      },
    });
}
