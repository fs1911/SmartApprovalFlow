-- CreateIndex
CREATE INDEX "attachments_tenantId_uploadedAt_idx" ON "attachments"("tenantId", "uploadedAt");

