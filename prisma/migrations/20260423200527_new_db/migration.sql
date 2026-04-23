-- AlterTable
ALTER TABLE "otp_requests" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ip_address" VARCHAR(45);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "message_id" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote_attempts" (
    "id" SERIAL NOT NULL,
    "voter_id" INTEGER,
    "phone" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL,
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "device_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_logs_message_id_key" ON "sms_logs"("message_id");

-- CreateIndex
CREATE INDEX "sms_logs_phone_idx" ON "sms_logs"("phone");

-- CreateIndex
CREATE INDEX "sms_logs_message_id_idx" ON "sms_logs"("message_id");

-- CreateIndex
CREATE INDEX "sms_logs_status_idx" ON "sms_logs"("status");

-- CreateIndex
CREATE INDEX "sms_logs_sent_at_idx" ON "sms_logs"("sent_at");

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "vote_attempts_status_idx" ON "vote_attempts"("status");

-- CreateIndex
CREATE INDEX "vote_attempts_created_at_idx" ON "vote_attempts"("created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
