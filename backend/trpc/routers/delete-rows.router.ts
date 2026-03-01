import { prisma } from "../../prisma/client";
import { router } from "../trpc";
import { protectedProcedure } from "../middleware/auth.middleware";
import { DeletedRowSchemaToSync } from "@w2s/shared/types/deleted-rows.types";

export const deleteRowsRouter = router({
  deleteDeletedRows: protectedProcedure
    .input(DeletedRowSchemaToSync)
    .query(async ({ input, ctx }) => {
      await prisma.$transaction(async (tx) => {
        for (const deletedRow of input) {
          switch (deletedRow.tableName) {
            case "exercises":
              await tx.exercise.delete({
                where: { id: deletedRow.rowId, userId: ctx.user.userId },
              });
              break;
            case "workouts":
              await tx.workout.delete({
                where: { id: deletedRow.rowId, userId: ctx.user.userId },
              });
              break;
            case "workoutexercises":
              await tx.workoutExercise.delete({
                where: { id: deletedRow.rowId, userId: ctx.user.userId },
              });
              break;
            case "sets":
              await tx.set.delete({
                where: { id: deletedRow.rowId, userId: ctx.user.userId },
              });
              break;
            case "sessions":
              await tx.session.delete({
                where: { id: deletedRow.rowId, userId: ctx.user.userId },
              });
              break;
            default:
              throw new Error(`Unknown table name: ${deletedRow.tableName}`);
          }
        }
      });
    }),
});
