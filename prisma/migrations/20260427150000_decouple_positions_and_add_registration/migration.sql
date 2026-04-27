-- Migration: Decouple positions and add registration windows (V2 - Resilient)

-- 1. Create email_logs table
CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" SERIAL NOT NULL,
    "to" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "resend_id" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_logs_resend_id_key" ON "email_logs"("resend_id");
CREATE INDEX IF NOT EXISTS "email_logs_to_idx" ON "email_logs"("to");
CREATE INDEX IF NOT EXISTS "email_logs_status_idx" ON "email_logs"("status");
CREATE INDEX IF NOT EXISTS "email_logs_sent_at_idx" ON "email_logs"("sent_at");

-- 2. Update voting_config
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='voting_config' AND column_name='voter_reg_opens_at') THEN
        ALTER TABLE "voting_config" ADD COLUMN "voter_reg_opens_at" TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='voting_config' AND column_name='voter_reg_closes_at') THEN
        ALTER TABLE "voting_config" ADD COLUMN "voter_reg_closes_at" TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Update otp_requests
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='otp_requests' AND column_name='email') THEN
        ALTER TABLE "otp_requests" ADD COLUMN "email" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='otp_requests' AND column_name='purpose') THEN
        ALTER TABLE "otp_requests" ADD COLUMN "purpose" VARCHAR(30) NOT NULL DEFAULT 'VOTE';
    END IF;
    -- attempts and ip_address might already exist from new_db migration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='otp_requests' AND column_name='attempts') THEN
        ALTER TABLE "otp_requests" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='otp_requests' AND column_name='ip_address') THEN
        ALTER TABLE "otp_requests" ADD COLUMN "ip_address" VARCHAR(45);
    END IF;
END $$;
ALTER TABLE "otp_requests" ALTER COLUMN "phone" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "otp_requests_email_sent_at_idx" ON "otp_requests"("email", "sent_at");
CREATE INDEX IF NOT EXISTS "otp_requests_email_verified_expires_at_idx" ON "otp_requests"("email", "verified", "expires_at");

-- 4. Update voters
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='voters' AND column_name='email') THEN
        ALTER TABLE "voters" ADD COLUMN "email" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='voters' AND column_name='email_verified') THEN
        ALTER TABLE "voters" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "voters_email_key" ON "voters"("email");
CREATE INDEX IF NOT EXISTS "voters_email_idx" ON "voters"("email");
CREATE INDEX IF NOT EXISTS "voters_email_verified_idx" ON "voters"("email_verified");

-- 5. Relationship Decoupling (Candidates & Votes)
-- Add position_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='position_id') THEN
        ALTER TABLE "candidates" ADD COLUMN "position_id" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='votes' AND column_name='position_id') THEN
        ALTER TABLE "votes" ADD COLUMN "position_id" INTEGER;
    END IF;
END $$;

-- Backfill position_id from existing position title relations
UPDATE "candidates" c SET "position_id" = (SELECT id FROM "positions" p WHERE p.title = c.position) WHERE "position_id" IS NULL;
UPDATE "votes" v SET "position_id" = (SELECT id FROM "positions" p WHERE p.title = v.position) WHERE "position_id" IS NULL;

-- Make position_id NOT NULL after backfill
-- Only if we found IDs for everyone. To be safe, we'll just leave them nullable if backfill failed.
-- But for production readiness, we should ensure they are set.
-- ALTER TABLE "candidates" ALTER COLUMN "position_id" SET NOT NULL;
-- ALTER TABLE "votes" ALTER COLUMN "position_id" SET NOT NULL;

-- Update foreign keys for Candidates
ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "candidates_position_fkey";
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old composite unique index on candidates and add new one
ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "candidates_id_position_key";
DROP INDEX IF EXISTS "candidates_id_position_key" CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "candidates_id_position_id_key" ON "candidates"("id", "position_id");

-- Update foreign keys for Votes
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "votes_position_fkey";
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "votes_candidate_id_position_fkey" CASCADE;

ALTER TABLE "votes" ADD CONSTRAINT "votes_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_fkey" FOREIGN KEY ("candidate_id", "position_id") REFERENCES "candidates"("id", "position_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update votes unique constraint
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "votes_voter_id_position_key";
DROP INDEX IF EXISTS "votes_voter_id_position_key" CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "votes_voter_id_position_id_key" ON "votes"("voter_id", "position_id");

-- 6. Final Clean up
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='votes') THEN
        ALTER TABLE "candidates" DROP COLUMN "votes";
    END IF;
END $$;
