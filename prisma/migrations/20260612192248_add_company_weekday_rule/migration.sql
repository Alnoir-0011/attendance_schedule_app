-- CreateTable
CREATE TABLE "company_weekday_rule" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "type" "CompanyDayType" NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_weekday_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_weekday_rule_weekday_key" ON "company_weekday_rule"("weekday");
