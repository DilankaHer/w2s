import * as UserTypes from "@shared/types/user.types";
import * as Crypto from "expo-crypto";
import { db } from "../database";
import { users } from "../schema/schemas";

export async function createUser(username: string): Promise<UserTypes.User> {
    const userId = Crypto.randomUUID();
    return await db.insert(users).values({
        id: userId,
        username: username,
        createdAt: new Date().toISOString(),
    }).returning().then(([user]) => user);
}

export async function getUser(): Promise<UserTypes.User | undefined> {
    return await db.query.users.findFirst({});
}

export async function updateUser(username: string): Promise<UserTypes.User | undefined> {
    return await db.update(users).set({
        username: username,
    }).returning().then(([user]) => user);
}