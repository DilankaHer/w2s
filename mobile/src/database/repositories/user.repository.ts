import * as UserTypes from "@w2s/shared/types/user.types";
import * as Crypto from "expo-crypto";
import { db } from "../database";
import { users } from "../schema/schemas";
import { eq } from "drizzle-orm";

export async function createUser(username: string) {
    const userId = Crypto.randomUUID();
    return await db.insert(users).values({
        id: userId,
        username: username,
        createdAt: new Date().toISOString(),
    }).returning().then(([user]) => user);
}

export async function getUser() {
    return await db.query.users.findFirst({});
}

export async function updateUser(username: string) {
    return await db.update(users).set({
        username: username,
    }).returning().then(([user]) => user);
}

export async function getUserToSync(): Promise<UserTypes.User | undefined> {
    return await db.query.users.findFirst({
        where: eq(users.isSynced, false),
    });
}

export async function updateUserSynced() {
    return await db.update(users).set({
        isSynced: true,
    }).where(eq(users.isSynced, false));
}