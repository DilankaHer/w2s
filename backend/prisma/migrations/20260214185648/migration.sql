/*
  Warnings:

  - A unique constraint covering the columns `[id,bodyPartId,equipmentId]` on the table `exercises` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "bodyPartId" INTEGER,
ADD COLUMN     "equipmentId" INTEGER;

-- CreateTable
CREATE TABLE "bodyparts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "bodyparts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bodyparts_name_key" ON "bodyparts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_name_key" ON "equipment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_id_bodyPartId_equipmentId_key" ON "exercises"("id", "bodyPartId", "equipmentId");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_bodyPartId_fkey" FOREIGN KEY ("bodyPartId") REFERENCES "bodyparts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
