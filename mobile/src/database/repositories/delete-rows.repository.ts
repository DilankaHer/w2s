import * as Crypto from "expo-crypto";
import { db } from "../database";
import * as DeletedRowInterface from "../interfaces/deleted-row.interface";
import { deletedRows } from "../schema/schemas";
import * as DeletedRowTypes from "@w2s/shared/types/deleted-rows.types";

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

export async function getDeletedRows(): Promise<DeletedRowTypes.DeletedRowToSync> {
  return await db.query.deletedRows.findMany();
}

export async function deleteDeletedRows() {
  await db.delete(deletedRows);
}
