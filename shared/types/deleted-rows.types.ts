import z from "zod";

export const DeletedRowSchemaToSync = z.array(z.object({
    id: z.string(),
    tableName: z.string(),
    rowId: z.string(),
}));

export type DeletedRowToSync = z.infer<typeof DeletedRowSchemaToSync>;