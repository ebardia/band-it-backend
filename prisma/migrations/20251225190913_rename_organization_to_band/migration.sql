-- Safe rename: preserves all data

-- Step 1: Rename bands table to bands
ALTER TABLE "bands" RENAME TO "bands";

-- Step 2: Rename band_Id columns to band_id in all tables
ALTER TABLE "members" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "proposals" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "projects" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "tasks" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "values" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "transactions" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "transaction_categories" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "financial_items" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "ai_agent_actions" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "audit_logs" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "endorsements" RENAME COLUMN "band_Id" TO "band_id";
ALTER TABLE "captains_log" RENAME COLUMN "band_Id" TO "band_id";

-- Step 3: Rename constraints (foreign keys)
ALTER TABLE "members" RENAME CONSTRAINT "members_band_Id_fkey" TO "members_band_id_fkey";
ALTER TABLE "proposals" RENAME CONSTRAINT "proposals_band_Id_fkey" TO "proposals_band_id_fkey";
ALTER TABLE "projects" RENAME CONSTRAINT "projects_band_Id_fkey" TO "projects_band_id_fkey";
ALTER TABLE "tasks" RENAME CONSTRAINT "tasks_band_Id_fkey" TO "tasks_band_id_fkey";
ALTER TABLE "values" RENAME CONSTRAINT "values_band_Id_fkey" TO "values_band_id_fkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "transactions_band_Id_fkey" TO "transactions_band_id_fkey";
ALTER TABLE "transaction_categories" RENAME CONSTRAINT "transaction_categories_band_Id_fkey" TO "transaction_categories_band_id_fkey";
ALTER TABLE "financial_items" RENAME CONSTRAINT "financial_items_band_Id_fkey" TO "financial_items_band_id_fkey";
ALTER TABLE "ai_agent_actions" RENAME CONSTRAINT "ai_agent_actions_band_Id_fkey" TO "ai_agent_actions_band_id_fkey";
ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_logs_band_Id_fkey" TO "audit_logs_band_id_fkey";
ALTER TABLE "endorsements" RENAME CONSTRAINT "endorsements_band_Id_fkey" TO "endorsements_band_id_fkey";
ALTER TABLE "captains_log" RENAME CONSTRAINT "captains_log_band_Id_fkey" TO "captains_log_band_id_fkey";

-- Step 4: Rename indexes
ALTER INDEX "members_band_Id_user_id_key" RENAME TO "members_band_id_user_id_key";
ALTER INDEX "audit_logs_band_Id_entity_type_entity_id_idx" RENAME TO "audit_logs_band_id_entity_type_entity_id_idx";
ALTER INDEX "captains_log_band_Id_timestamp_idx" RENAME TO "captains_log_band_id_timestamp_idx";
ALTER INDEX "financial_items_band_Id_status_idx" RENAME TO "financial_items_band_id_status_idx";
ALTER INDEX "transactions_band_Id_transaction_date_idx" RENAME TO "transactions_band_id_transaction_date_idx";