import { z } from "zod";

export const UserSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().optional(),
    createdAt: z.string(),
    isSynced: z.boolean().optional(),
});

export const UserSchemaCreate = z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    createdAt: z.string(),
    isMobile: z.boolean(),
});

export type User = z.infer<typeof UserSchema>;