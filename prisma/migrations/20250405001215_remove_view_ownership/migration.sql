/*
  Warnings:

  - You are about to drop the column `createdAt` on the `View` table. All the data in the column will be lost.
  - You are about to drop the column `creatorId` on the `View` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "View" DROP CONSTRAINT "View_creatorId_fkey";

-- AlterTable
ALTER TABLE "View" DROP COLUMN "createdAt",
DROP COLUMN "creatorId";
