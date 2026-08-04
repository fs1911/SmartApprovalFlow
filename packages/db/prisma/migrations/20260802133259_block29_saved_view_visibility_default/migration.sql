-- AlterTable
ALTER TABLE "saved_views" ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'SHARED';

-- CreateTable
CREATE TABLE "saved_view_defaults" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedViewId" TEXT NOT NULL,

    CONSTRAINT "saved_view_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_view_defaults_tenantId_idx" ON "saved_view_defaults"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_view_defaults_userId_key" ON "saved_view_defaults"("userId");

-- AddForeignKey
ALTER TABLE "saved_view_defaults" ADD CONSTRAINT "saved_view_defaults_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_view_defaults" ADD CONSTRAINT "saved_view_defaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_view_defaults" ADD CONSTRAINT "saved_view_defaults_savedViewId_fkey" FOREIGN KEY ("savedViewId") REFERENCES "saved_views"("id") ON DELETE CASCADE ON UPDATE CASCADE;
