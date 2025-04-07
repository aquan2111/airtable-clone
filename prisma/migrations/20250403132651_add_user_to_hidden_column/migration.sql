/*
  Warnings:

  - The primary key for the `HiddenColumn` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[userId,columnId]` on the table `HiddenColumn` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `HiddenColumn` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `userId` to the `HiddenColumn` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HiddenColumn" DROP CONSTRAINT "HiddenColumn_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "viewId" DROP NOT NULL,
ADD CONSTRAINT "HiddenColumn_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenColumn_userId_columnId_key" ON "HiddenColumn"("userId", "columnId");

-- AddForeignKey
ALTER TABLE "HiddenColumn" ADD CONSTRAINT "HiddenColumn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
