import { z } from "zod";

export const RequestMagicLinkSchema = z.object({
    email: z.string(),
    userId: z.string(),
    username: z.string(),
    isMobile: z.boolean(),
});

export type RequestMagicLinkType = z.infer<typeof RequestMagicLinkSchema>;

