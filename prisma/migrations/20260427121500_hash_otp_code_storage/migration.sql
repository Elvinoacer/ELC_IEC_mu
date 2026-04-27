-- Store OTP values as SHA-256 hex hashes (64 chars) instead of raw short codes.
-- Existing plaintext values remain temporarily verifiable in application logic
-- until they naturally expire.
ALTER TABLE "otp_requests"
  ALTER COLUMN "code" TYPE VARCHAR(64);
