import * as Crypto from "expo-crypto";
import { db } from "../database";
import * as DeletedRowInterface from "../interfaces/deleted-row.types";
import { deletedRows } from "../schema/schemas";

export async function insertDeletedRows(
  rowsDeleted: DeletedRowInterface.DeletedRow[],
): Promise<void> {
  await db.insert(deletedRows).values(
    rowsDeleted.map((row) => ({
      id: Crypto.randomUUID(),
      tableName: row.tableName,
      rowId: row.rowId,
    })),
  );
}

export async function getDeletedRows(): Promise<DeletedRowInterface.DeletedRow[]> {
  return await db.query.deletedRows.findMany();
}
