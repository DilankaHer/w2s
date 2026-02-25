import * as Crypto from "expo-crypto";
import { db } from "../database";
import { DeletedRow } from "../interface";
import { deletedRows } from "../schema/schemas";

export async function insertDeletedRows(rowsDeleted: DeletedRow[]): Promise<void> {
    await db.insert(deletedRows).values(rowsDeleted.map(row => ({
        id: Crypto.randomUUID(),
        tableName: row.tableName,
        rowId: row.rowId,
    })));
}