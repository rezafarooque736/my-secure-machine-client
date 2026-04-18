/*
  Warnings:

  - The `type` column on the `notices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `logoutReason` column on the `user_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `connection_sessions` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `level` on the `activity_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `activity_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ActivityLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR', 'SUCCESS');

-- CreateEnum
CREATE TYPE "ActivityLogCategory" AS ENUM ('AUTH', 'CONNECTION', 'SYSTEM', 'USER_ACTION');

-- CreateEnum
CREATE TYPE "UserSessionLogoutReason" AS ENUM ('MANUAL', 'TIMEOUT', 'FORCED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'UPDATE');

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "level",
ADD COLUMN     "level" "ActivityLogLevel" NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" "ActivityLogCategory" NOT NULL;

-- AlterTable
ALTER TABLE "notices" DROP COLUMN "type",
ADD COLUMN     "type" "NoticeType" NOT NULL DEFAULT 'INFO';

-- AlterTable
ALTER TABLE "user_sessions" DROP COLUMN "logoutReason",
ADD COLUMN     "logoutReason" "UserSessionLogoutReason";

-- DropTable
DROP TABLE "connection_sessions";

-- CreateIndex
CREATE INDEX "activity_logs_category_idx" ON "activity_logs"("category");
