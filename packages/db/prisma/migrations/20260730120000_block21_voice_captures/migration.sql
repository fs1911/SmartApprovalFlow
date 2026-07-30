-- CreateTable
CREATE TABLE "voice_captures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "transcript" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "language" TEXT,
    "durationSec" INTEGER,
    "audioStorageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_captures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voice_captures_tenantId_createdAt_idx" ON "voice_captures"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "voice_captures" ADD CONSTRAINT "voice_captures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_captures" ADD CONSTRAINT "voice_captures_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

