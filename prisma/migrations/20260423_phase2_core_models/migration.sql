-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'IEC',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voters" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "has_voted" BOOLEAN NOT NULL DEFAULT false,
    "voted_at" TIMESTAMPTZ,
    "device_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" INTEGER,

    CONSTRAINT "voters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "school" VARCHAR(150) NOT NULL,
    "year_of_study" VARCHAR(50) NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "scholar_code" VARCHAR(50) NOT NULL,
    "photo_url" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "rejection_note" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by" INTEGER,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" SERIAL NOT NULL,
    "voter_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "cast_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_config" (
    "id" SERIAL NOT NULL,
    "opens_at" TIMESTAMPTZ NOT NULL,
    "closes_at" TIMESTAMPTZ NOT NULL,
    "candidate_reg_opens_at" TIMESTAMPTZ,
    "candidate_reg_closes_at" TIMESTAMPTZ,
    "is_manually_closed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "voting_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE INDEX "admins_role_idx" ON "admins"("role");

-- CreateIndex
CREATE INDEX "admins_created_at_idx" ON "admins"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "voters_phone_key" ON "voters"("phone");

-- CreateIndex
CREATE INDEX "voters_added_by_idx" ON "voters"("added_by");

-- CreateIndex
CREATE INDEX "voters_has_voted_idx" ON "voters"("has_voted");

-- CreateIndex
CREATE INDEX "voters_voted_at_idx" ON "voters"("voted_at");

-- CreateIndex
CREATE INDEX "voters_created_at_idx" ON "voters"("created_at");

-- CreateIndex
CREATE INDEX "voters_name_idx" ON "voters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "positions_title_key" ON "positions"("title");

-- CreateIndex
CREATE INDEX "positions_display_order_idx" ON "positions"("display_order");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_phone_key" ON "candidates"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_scholar_code_key" ON "candidates"("scholar_code");

-- CreateIndex
CREATE INDEX "candidates_status_position_idx" ON "candidates"("status", "position");

-- CreateIndex
CREATE INDEX "candidates_submitted_at_idx" ON "candidates"("submitted_at");

-- CreateIndex
CREATE INDEX "candidates_reviewed_by_idx" ON "candidates"("reviewed_by");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_id_position_key" ON "candidates"("id", "position");

-- CreateIndex
CREATE INDEX "votes_candidate_id_idx" ON "votes"("candidate_id");

-- CreateIndex
CREATE INDEX "votes_position_idx" ON "votes"("position");

-- CreateIndex
CREATE INDEX "votes_cast_at_idx" ON "votes"("cast_at");

-- CreateIndex
CREATE UNIQUE INDEX "votes_voter_id_position_key" ON "votes"("voter_id", "position");

-- CreateIndex
CREATE INDEX "otp_requests_phone_sent_at_idx" ON "otp_requests"("phone", "sent_at");

-- CreateIndex
CREATE INDEX "otp_requests_phone_verified_expires_at_idx" ON "otp_requests"("phone", "verified", "expires_at");

-- CreateIndex
CREATE INDEX "otp_requests_expires_at_idx" ON "otp_requests"("expires_at");

-- CreateIndex
CREATE INDEX "voting_config_updated_by_idx" ON "voting_config"("updated_by");

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_phone_fkey" FOREIGN KEY ("phone") REFERENCES "voters"("phone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_fkey" FOREIGN KEY ("position") REFERENCES "positions"("title") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "voters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_id_position_fkey" FOREIGN KEY ("candidate_id", "position") REFERENCES "candidates"("id", "position") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_position_fkey" FOREIGN KEY ("position") REFERENCES "positions"("title") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_config" ADD CONSTRAINT "voting_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

