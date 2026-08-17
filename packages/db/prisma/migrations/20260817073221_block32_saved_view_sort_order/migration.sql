-- AlterTable
ALTER TABLE "saved_views" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "saved_views_tenantId_sortOrder_idx" ON "saved_views"("tenantId", "sortOrder");
