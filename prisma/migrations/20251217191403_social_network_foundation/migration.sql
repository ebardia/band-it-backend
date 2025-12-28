/*
  Warnings:

  - You are about to drop the column `email` on the `members` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[band_Id,user_id]` on the table `members` will be added. If there are existing duplicate values, this will fail.
  - Made the column `user_id` on table `members` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_user_id_fkey";

-- DropIndex
DROP INDEX "members_band_Id_email_key";

-- AlterTable
ALTER TABLE "members" DROP COLUMN "email",
ADD COLUMN     "custom_title" TEXT,
ADD COLUMN     "proposals_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tasks_completed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "votes_cast" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "bands" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "member_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "short_description" TEXT,
ADD COLUMN     "tags" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "contribution_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "hours_per_week" INTEGER,
ADD COLUMN     "last_active_at" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "passions" JSONB DEFAULT '[]',
ADD COLUMN     "profile_visibility" TEXT NOT NULL DEFAULT 'public',
ADD COLUMN     "remote_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skills" JSONB DEFAULT '[]',
ADD COLUMN     "social_links" JSONB DEFAULT '{}',
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "wants_to_learn" JSONB DEFAULT '[]';

-- CreateTable
CREATE TABLE "endorsements" (
    "id" TEXT NOT NULL,
    "endorser_id" TEXT NOT NULL,
    "endorsed_id" TEXT NOT NULL,
    "skill_name" TEXT NOT NULL,
    "comment" TEXT,
    "context" TEXT,
    "band_Id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "endorsements_endorsed_id_idx" ON "endorsements"("endorsed_id");

-- CreateIndex
CREATE UNIQUE INDEX "endorsements_endorser_id_endorsed_id_skill_name_key" ON "endorsements"("endorser_id", "endorsed_id", "skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "members_band_Id_user_id_key" ON "members"("band_Id", "user_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_endorser_id_fkey" FOREIGN KEY ("endorser_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_endorsed_id_fkey" FOREIGN KEY ("endorsed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_band_Id_fkey" FOREIGN KEY ("band_Id") REFERENCES "bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
