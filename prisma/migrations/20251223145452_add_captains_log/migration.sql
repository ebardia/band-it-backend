-- CreateTable
CREATE TABLE "captains_log" (
    "id" TEXT NOT NULL,
    "band_Id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL DEFAULT 'member',
    "action" TEXT NOT NULL,
    "action_past" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_name" TEXT,
    "context" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captains_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "captains_log_band_Id_timestamp_idx" ON "captains_log"("band_Id", "timestamp");

-- CreateIndex
CREATE INDEX "captains_log_entity_type_entity_id_idx" ON "captains_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "captains_log_actor_id_idx" ON "captains_log"("actor_id");

-- AddForeignKey
ALTER TABLE "captains_log" ADD CONSTRAINT "captains_log_band_Id_fkey" FOREIGN KEY ("band_Id") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captains_log" ADD CONSTRAINT "captains_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
