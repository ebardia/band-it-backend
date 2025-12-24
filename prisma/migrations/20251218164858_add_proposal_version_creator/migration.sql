/*
  Warnings:

  - Added the required column `created_by` to the `proposal_versions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "proposal_versions" ADD COLUMN     "created_by" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
