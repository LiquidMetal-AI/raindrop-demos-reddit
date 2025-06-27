-- CreateTable
CREATE TABLE "Calculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expression" TEXT NOT NULL,
    "result" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Calculation_timestamp_idx" ON "Calculation"("timestamp");

-- CreateIndex
CREATE INDEX "Calculation_user_id_idx" ON "Calculation"("user_id");
