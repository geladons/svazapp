/*
  Warnings:

  - Added the required column `requestedBy` to the `contacts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add column with temporary default value for existing rows
ALTER TABLE "contacts" ADD COLUMN "requestedBy" TEXT;

-- For existing contacts, set requestedBy to userId (assume the user who owns the record initiated it)
-- This is a best-effort migration for existing data
UPDATE "contacts" SET "requestedBy" = "userId" WHERE "requestedBy" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "contacts" ALTER COLUMN "requestedBy" SET NOT NULL;

-- CreateIndex
CREATE INDEX "contacts_requestedBy_idx" ON "contacts"("requestedBy");
