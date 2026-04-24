# OTP Migration Plan: SMS → Email (Resend)
### ELC IEC Voting System — `ELC_IEC_mu-main`

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Current Architecture Audit](#2-current-architecture-audit)
3. [High-Level Migration Strategy](#3-high-level-migration-strategy)
4. [Phase A — Email Association (Pre-Election Registration)](#4-phase-a--email-association-pre-election-registration)
5. [Phase B — OTP Voting Flow (Election Day)](#5-phase-b--otp-voting-flow-election-day)
6. [Database Schema Changes](#6-database-schema-changes)
7. [New Library: `lib/email.ts` (Resend)](#7-new-library-libemailts-resend)
8. [OTP Library Refactor: `lib/otp.ts`](#8-otp-library-refactor-libotpts)
9. [New API Routes](#9-new-api-routes)
10. [Modified API Routes](#10-modified-api-routes)
11. [New UI Pages & Components](#11-new-ui-pages--components)
12. [Modified UI Components](#12-modified-ui-components)
13. [Admin Panel Updates](#13-admin-panel-updates)
14. [Anti-Double-Voting & Security](#14-anti-double-voting--security)
15. [Environment Variables](#15-environment-variables)
16. [Prisma Migration Sequence](#16-prisma-migration-sequence)
17. [Deprecations & Cleanup](#17-deprecations--cleanup)
18. [Implementation Checklist](#18-implementation-checklist)

---

## 1. Overview & Goals

### What is changing

| Aspect | Before | After |
|---|---|---|
| OTP delivery channel | Africa's Talking SMS | Resend transactional email |
| Voter identity anchor | Phone number | Phone number (unchanged as biometric key) |
| OTP destination | The voter's phone | The voter's verified email address |
| Pre-voting step | None | Email-to-phone association (one-time) |
| Anti-fraud layer | Device hash + `hasVoted` flag | Device hash + `hasVoted` + email ownership proof |

### Goals

- **Phone as biometric** — voters still identify themselves by phone number on election day.
- **Email as OTP channel** — every OTP is delivered by Resend to the email linked to that phone number.
- **Email ownership proof** — before an email is associated with a phone, it must be verified with a one-time code sent to that email (no phantom associations).
- **No double voting** — existing DB-level `@@unique([voterId, position])` + `hasVoted` + device fingerprint are all preserved and extended.
- **Clean HTML emails** — Resend templates include proper branded HTML (not plain text).

---

## 2. Current Architecture Audit

### Files that will change

| File | Why it changes |
|---|---|
| `prisma/schema.prisma` | Add `email`, `emailVerified` to `Voter`; update `OtpRequest` to support email key; replace `SmsLog` with `EmailLog` |
| `lib/otp.ts` | `sendOTP` now dispatches via email, not SMS |
| `lib/sms.ts` | Deprecated → moved to `lib/sms.ts.bak` (or deleted after confirming no other usages) |
| `app/api/vote/auth/request-otp/route.ts` | Guards: voter must have a verified email; sends OTP to email |
| `app/api/vote/auth/verify-otp/route.ts` | No structural change; OTP lookup is still by phone |
| `app/api/admin/voters/route.ts` | Return `email` + `emailVerified` fields |
| `app/api/admin/voters/[id]/route.ts` | Allow PATCH of `email` field by admin |
| `app/api/admin/voters/bulk/route.ts` | Accept optional `email` column in CSV import |
| `components/voter/AuthCard.tsx` | Show masked email (not phone) once OTP is dispatched |
| `components/admin/AddVoterModal.tsx` | Add optional email field |
| `components/admin/VoterImportModal.tsx` | Document + support `email` CSV column |

### Files that will be added

| File | Purpose |
|---|---|
| `lib/email.ts` | Resend client, HTML templates, `sendEmailOTP()`, `tryEmailSend()` |
| `app/api/voter/register-email/route.ts` | Phase A Step 1 — accept phone + email, send verification OTP |
| `app/api/voter/register-email/verify/route.ts` | Phase A Step 2 — verify OTP, persist `email + emailVerified=true` |
| `app/(public)/register-email/page.tsx` | Public UI page for the email association flow |
| `components/voter/EmailRegistrationCard.tsx` | Two-step UI component (phone → email entry → OTP verify) |

### Files that are untouched

`lib/jwt.ts`, `lib/fingerprint.ts`, `lib/phone.ts`, `lib/admin-auth.ts`, `lib/audit.ts`, `app/api/vote/submit/route.ts`, all candidate routes, all admin auth routes, all result routes.

---

## 3. High-Level Migration Strategy

```
ELECTION PREP                          ELECTION DAY
─────────────────────────────────────  ────────────────────────────────────────────────
 Admin uploads voter CSV               Voter opens the voting site
 (phone + optional name + email)
                                        Step 1 → Enter phone number
 Voter visits /register-email           Step 2 → System looks up linked email
 Enters their phone number              Step 3 → Resend sends 6-digit OTP to email
 Enters their email address             Step 4 → Voter enters OTP in browser
 Receives verification OTP on email     Step 5 → System verifies OTP
 Enters OTP → email linked to phone     Step 6 → Voter is authenticated → casts vote
```

Phone numbers remain the single source of identity. The email is purely a delivery address for OTPs and a proof of ownership. Voters who arrive on election day without a linked verified email are **blocked** — they must complete Phase A first.

---

## 4. Phase A — Email Association (Pre-Election Registration)

This is a new flow. It runs **before** the election opens, but the system must allow it even while voting is closed.

### Step 1 — Voter submits phone + email

**Route:** `POST /api/voter/register-email`

Request body:
```json
{ "phone": "0712345678", "email": "voter@example.com" }
```

Server logic:
1. Normalize phone → E.164.
2. Validate email format with Zod `z.string().email()`.
3. Look up voter by phone in `voters` table. If not found → `404`.
4. If `voter.emailVerified === true` already → `409 Conflict` ("Email already registered and verified for this account.").
5. Check that the email is not already linked to **another** phone (`voters` table, `email = ?` AND `id != voter.id`). If taken → `409 Conflict` ("This email is already linked to another voter account.").
6. Rate-limit: max 5 OTP requests per phone per hour (reuse `getOTPRateLimitState`).
7. Generate & store an email-verification OTP in `OtpRequest` (new `email` column as key, **not** phone key, to distinguish it from vote-day OTPs).
8. Send OTP via Resend using the **email verification HTML template**.
9. Temporarily write `voter.email = email, voter.emailVerified = false` so the next step knows which email to validate against.
10. Return `{ expiresAt, cooldownSeconds }`.

### Step 2 — Voter submits OTP to confirm email ownership

**Route:** `POST /api/voter/register-email/verify`

Request body:
```json
{ "phone": "0712345678", "email": "voter@example.com", "code": "381920" }
```

Server logic:
1. Normalize phone.
2. Look up voter. Confirm `voter.email === email` (must match what was sent in Step 1).
3. Run `verifyOTPByEmail(email, code)` — new function in `lib/otp.ts` that queries `OtpRequest` by `email` key.
4. On `ok` → set `voter.emailVerified = true` in DB. Also audit-log the event.
5. On `expired / wrong / locked` → return appropriate error (same shape as existing vote OTP errors).
6. Return `{ message: "Email verified and linked." }`.

### What admin sees during Phase A

The admin voters page gains two new columns: **Email** and **Email Status** (`Verified` / `Pending` / `—`). Admins can also manually enter or overwrite a voter's email (with a warning that the voter will need to re-verify), and can reset `emailVerified` if needed.

---

## 5. Phase B — OTP Voting Flow (Election Day)

This is the **modified** version of the existing vote auth flow.

### Step 1 — Voter enters phone number

**Route:** `POST /api/vote/auth/request-otp` (modified)

New guard added at the top:
```
if (!voter.email || !voter.emailVerified) {
  return error(
    "Your account does not have a verified email. Please visit the registration desk.",
    403
  );
}
```

Everything else is the same, except:
- `sendOTP(phone, ipAddress)` internally now calls `sendEmailOTP(voter.email, code)` instead of `sendSMS(phone, ...)`.
- The response still returns `{ alreadySent, expiresAt, cooldownSeconds }` — the email address is **not** returned verbatim; instead return a masked form: `j****@gmail.com` (see masking helper below).

### Step 2 — Voter enters OTP

**Route:** `POST /api/vote/auth/verify-otp` — **no changes needed**. The OTP record is still keyed by phone. Verification logic is identical.

### OTP record keying

During Phase B vote-day OTPs, the `OtpRequest.phone` field stays as the key (backward compatible). During Phase A email-registration OTPs, the `OtpRequest.email` field is the key and `OtpRequest.phone` is null. This distinction is used by the new `verifyOTPByEmail()` function.

---

## 6. Database Schema Changes

### `Voter` model — add two fields

```prisma
model Voter {
  // ... existing fields ...
  email         String?  @db.VarChar(255)  // Linked email for OTP delivery
  emailVerified Boolean  @default(false)   @map("email_verified")

  // ... rest of relations ...
  @@unique([email])     // One email per voter, globally unique
  @@index([email])
  @@index([emailVerified])
}
```

**Migration note:** existing voters get `email = null, emailVerified = false`. No data is lost.

### `OtpRequest` model — add email support

```prisma
model OtpRequest {
  id        Int      @id @default(autoincrement())
  phone     String?  @db.VarChar(20)    // Null for email-registration OTPs
  email     String?  @db.VarChar(255)   // Null for vote-day OTPs
  code      String   @db.VarChar(10)
  sentAt    DateTime @default(now())    @map("sent_at")      @db.Timestamptz
  verified  Boolean  @default(false)
  expiresAt DateTime @map("expires_at")                      @db.Timestamptz
  attempts  Int      @default(0)
  ipAddress String?  @map("ip_address")                      @db.VarChar(45)
  purpose   String   @default("VOTE")  @db.VarChar(30)       // "VOTE" | "EMAIL_REG"

  @@index([phone, sentAt])
  @@index([phone, verified, expiresAt])
  @@index([email, sentAt])
  @@index([email, verified, expiresAt])
  @@index([expiresAt])
  @@map("otp_requests")
}
```

### `EmailLog` model — replaces `SmsLog` for email channel

```prisma
model EmailLog {
  id            Int      @id @default(autoincrement())
  to            String   @db.VarChar(255)
  subject       String   @db.VarChar(255)
  resendId      String?  @unique @map("resend_id")  @db.VarChar(100)
  status        String   @default("PENDING")        @db.VarChar(50)   // PENDING | SENT | FAILED | SIMULATED
  failureReason String?  @map("failure_reason")     @db.Text
  sentAt        DateTime @default(now())             @map("sent_at")   @db.Timestamptz
  updatedAt     DateTime @updatedAt                 @map("updated_at") @db.Timestamptz

  @@index([to])
  @@index([resendId])
  @@index([status])
  @@index([sentAt])
  @@map("email_logs")
}
```

`SmsLog` remains in the schema (no `DROP TABLE`) until confirmed no other process reads it. Add a deprecation comment.

---

## 7. New Library: `lib/email.ts` (Resend)

### Install Resend SDK

```bash
npm install resend
```

### File structure

```ts
// lib/email.ts

import { Resend } from 'resend';
import { prisma } from './prisma';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS   = process.env.RESEND_FROM || 'noreply@yourdomain.com';  // your verified domain
const IS_SIMULATION  = !RESEND_API_KEY;

const resend = IS_SIMULATION ? null : new Resend(RESEND_API_KEY);
```

### Email Templates

All templates return `{ subject: string; html: string }`.

#### Template 1 — OTP for vote authentication

```
Subject: Your ELP Moi Chapter Voting Code — [CODE]

HTML body (branded):
  - ELP Moi Chapter logo / header
  - Large 6-digit code displayed prominently
  - "This code expires in 5 minutes."
  - "Do not share this code with anyone."
  - Footer with election details
```

#### Template 2 — Email verification (Phase A)

```
Subject: Verify Your Email — ELP Moi Chapter Elections

HTML body:
  - Explanation: "You requested to link this email to your voter account."
  - Large 6-digit code
  - "This code expires in 10 minutes."
  - "If you did not request this, ignore this email."
```

#### Template 3 — Vote confirmation (replaces SMS confirmation)

```
Subject: Your Vote Has Been Cast — ELP Moi Chapter

HTML body:
  - Confirmation message
  - Timestamp
  - "Thank you for participating."
```

### Core send function

```ts
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void>
```

- Creates an `EmailLog` record first (audit trail).
- In simulation mode (no `RESEND_API_KEY`): logs to console, sets status `SIMULATED`, returns.
- In live mode: calls `resend.emails.send(...)`, stores `resendId`, updates `EmailLog`.
- On failure: updates `EmailLog.status = 'FAILED'`, throws.

### Convenience wrappers

```ts
export async function sendEmailOTP(to: string, code: string): Promise<void>
export async function sendEmailVerificationOTP(to: string, code: string): Promise<void>
export async function tryEmailSend(to: string, subject: string, html: string): Promise<boolean>
```

### Email masking helper

```ts
// Returns "j****@gmail.com" — used in API response to confirm delivery without exposing address
export function maskEmail(email: string): string
```

---

## 8. OTP Library Refactor: `lib/otp.ts`

### Changes to existing functions

#### `sendOTP(phone, ipAddress)` — modified

```ts
export async function sendOTP(
  phone: string,
  voterEmail: string,      // NEW: caller must pass voter's verified email
  ipAddress?: string
): Promise<{ expiresAt: Date; emailFailed: boolean }>
```

- Remove the `sendSMS` call.
- Replace with `sendEmailOTP(voterEmail, code)`.
- Rename the result flag from `smsFailed` to `emailFailed`.
- `smsFailed` is kept as a type alias pointing to `emailFailed` for backward compat in the route response.

#### `findRecentReusableOTP(phone)` — unchanged

#### `verifyOTP(phone, code)` — unchanged

### New function

#### `sendEmailRegistrationOTP(email, phone, ipAddress)` — for Phase A

```ts
export async function sendEmailRegistrationOTP(
  email: string,
  phone: string,
  ipAddress?: string
): Promise<{ expiresAt: Date; emailFailed: boolean }>
```

- Generates a code with longer TTL (e.g. 10 minutes for registration vs 5 minutes for vote day).
- Creates `OtpRequest` with `email = email`, `phone = null`, `purpose = 'EMAIL_REG'`.
- Calls `sendEmailVerificationOTP(email, code)`.

#### `verifyOTPByEmail(email, code)` — for Phase A

```ts
export async function verifyOTPByEmail(
  email: string,
  code: string
): Promise<VerifyResult>
```

- Identical logic to `verifyOTP` but queries by `email` field instead of `phone`.

#### `getOTPRateLimitStateByEmail(email, ipAddress)` — for Phase A rate limiting

- Mirrors `getOTPRateLimitState` but queries `OtpRequest.email` field.

---

## 9. New API Routes

### `POST /api/voter/register-email`

**File:** `app/api/voter/register-email/route.ts`

```
Request  → { phone: string, email: string }
Response → { expiresAt: string, cooldownSeconds: number, maskedEmail: string }
Errors   → 400 (invalid format), 404 (phone not in registry),
           409 (already verified | email taken by another voter), 429 (rate limit)
```

### `POST /api/voter/register-email/verify`

**File:** `app/api/voter/register-email/verify/route.ts`

```
Request  → { phone: string, email: string, code: string }
Response → { message: "Email verified and linked." }
Errors   → 400 (wrong/expired OTP), 404 (voter not found),
           409 (email mismatch — voter changed email before verifying)
```

---

## 10. Modified API Routes

### `POST /api/vote/auth/request-otp`

**File:** `app/api/vote/auth/request-otp/route.ts`

Changes:
1. After fetching the voter, add guard:
   ```ts
   if (!voter.email || !voter.emailVerified) {
     return error(
       "No verified email on file. Please register your email before voting.",
       403
     );
   }
   ```
2. Pass `voter.email` to the updated `sendOTP(phone, voter.email, ipAddress)` call.
3. Change response field `smsWarning` → `emailWarning`.
4. Add `maskedEmail` to success response: `maskEmail(voter.email)` (so the UI can show "Code sent to j****@gmail.com").

### `POST /api/vote/auth/verify-otp`

No structural changes — OTP is still keyed by phone. The `verifyOTP(phone, code)` call is unchanged.

### `GET/POST /api/admin/voters` (list + add)

- Expose `email` and `emailVerified` in list responses.
- Accept optional `email` field in POST body (admin-added voter).

### `PATCH /api/admin/voters/[id]`

- Allow PATCH `{ email: string | null }` to update email.
- When admin changes email, reset `emailVerified = false` automatically.
- Audit log: `"ADMIN_UPDATE_VOTER_EMAIL"`.

### `POST /api/admin/voters/bulk`

- Support optional `email` column in uploaded CSV (`phone`, `name`, `email`).
- Validate email format with Zod; skip invalid rows (log them in the import result summary).
- Do not set `emailVerified = true` on bulk import — voters must self-verify via Phase A.

---

## 11. New UI Pages & Components

### Page: `/register-email`

**File:** `app/(public)/register-email/page.tsx`

- Renders `<EmailRegistrationCard />`.
- Should be accessible whether or not voting is open (election window check is bypassed for this route).
- Meta title: "Register Your Email — ELP Moi Chapter Elections".

### Component: `EmailRegistrationCard`

**File:** `components/voter/EmailRegistrationCard.tsx`

```
Steps: PHONE → EMAIL_ENTRY → OTP_VERIFY → SUCCESS

PHONE step:
  - Reuse <PhoneInput> component
  - "Enter your registered phone number"
  - CTA: "Continue"

EMAIL_ENTRY step:
  - Show normalized phone (read-only)
  - Email <input type="email"> field
  - "Enter the email address you want to receive your voting OTP on"
  - CTA: "Send Verification Code"

OTP_VERIFY step:
  - Show "A 6-digit code was sent to [masked email]"
  - Reuse <OtpInput> component
  - Resend button (with cooldown)
  - CTA: "Verify & Link Email"

SUCCESS step:
  - Checkmark icon
  - "Your email has been verified and linked to your voter account."
  - "On election day, your OTP will be sent to [masked email]."
  - Link back to home
```

### HTML Email Templates (rendered server-side, sent via Resend)

Each template is a self-contained HTML string function in `lib/email.ts`:

**Structure for all templates:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Subject]</title>
  <style>
    /* Inline CSS: brand colors, max-width 600px, mobile-responsive */
  </style>
</head>
<body>
  <!-- Header with ELP Moi Chapter branding + logo -->
  <!-- Main content: code in large box, instructions -->
  <!-- Footer: election info, "this is an automated message" -->
</body>
</html>
```

Key design rules:
- Max width `600px`, centered, background `#f8fafc`.
- Brand primary color (match existing Tailwind theme in the app).
- OTP code displayed in a `letter-spacing: 8px; font-size: 36px; font-weight: 700` block.
- All styles **inlined** (Resend strips `<style>` tags on some clients).

---

## 12. Modified UI Components

### `AuthCard.tsx`

Changes:

1. **After OTP is dispatched:** display `"Code sent to [maskedEmail]"` (read from API response `maskedEmail` field) instead of the phone number.
2. **Guard messaging:** if the API returns `403` with the "no verified email" error, show a specific message:
   > "Your account does not have a verified email on file. Please visit the registration desk or go to [register your email](/register-email) before voting day."
3. Rename internal state `smsWarning` → `emailWarning`.

---

## 13. Admin Panel Updates

### Voters List (`app/(admin)/admin/voters/page.tsx`)

- Add **Email** column (truncated with tooltip).
- Add **Email Status** badge: `Verified` (green), `Pending` (yellow), `—` (grey).
- Update the `Voter` TypeScript interface:
  ```ts
  interface Voter {
    id: number;
    phone: string;
    name: string | null;
    email: string | null;       // NEW
    emailVerified: boolean;     // NEW
    hasVoted: boolean;
    createdAt: string;
  }
  ```

### `AddVoterModal.tsx`

- Add optional **Email** field (email input, validated client-side).
- Display note: "If provided, voter will still need to self-verify their email before election day."

### `VoterImportModal.tsx`

- Update CSV format documentation to mention optional `email` column.
- Show per-row email validation errors in the import preview/result.

### New Admin Stat (optional enhancement)

On `admin/dashboard`, add a count tile: **"Voters with verified email: X / Y"** so the IEC can track registration progress.

---

## 14. Anti-Double-Voting & Security

All existing mechanisms are **preserved**:

| Layer | Mechanism | Status |
|---|---|---|
| DB constraint | `@@unique([voterId, position])` — one vote per position per voter | ✅ Unchanged |
| Voter flag | `hasVoted = true` set atomically in `vote/submit` | ✅ Unchanged |
| Device fingerprint | `deviceHash` stored on first OTP verify, checked on re-entry | ✅ Unchanged |
| OTP expiry | 5 minutes TTL | ✅ Unchanged |
| OTP attempt lock | 3 wrong attempts → code invalidated | ✅ Unchanged |
| Rate limiting | Max 5 OTPs per phone per hour | ✅ Unchanged |

**New mechanisms added:**

| Layer | Mechanism |
|---|---|
| Email uniqueness | `@@unique([email])` on `Voter` — one email per account, no sharing |
| Email ownership proof | Phase A OTP to email must succeed before `emailVerified = true` |
| Vote gate | `request-otp` hard-blocks voters with `emailVerified = false` |
| Email change audit | Admin email overwrites reset `emailVerified = false` + audit log |
| OTP purpose segregation | `OtpRequest.purpose` distinguishes `VOTE` vs `EMAIL_REG` — a registration OTP cannot authenticate a vote session |

---

## 15. Environment Variables

### Remove (no longer needed once SMS is fully replaced)

```env
AT_USERNAME=
AT_API_KEY=
AT_SENDER_ID=
```

> ⚠️ Do not delete immediately — keep them commented during the transition period in case of rollback.

### Add

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@yourdomain.com     # Must be a verified sender on Resend

# OTP config (existing — can stay as-is)
OTP_TTL_SECONDS=300
OTP_DIGITS=6
OTP_MAX_ATTEMPTS=3
OTP_MAX_PER_HOUR=5

# New: TTL for email-registration OTPs (longer window since it's a pre-election step)
EMAIL_REG_OTP_TTL_SECONDS=600
```

---

## 16. Prisma Migration Sequence

Run migrations in this order:

### Migration 1 — Add email fields to voters

```sql
ALTER TABLE voters
  ADD COLUMN email          VARCHAR(255) UNIQUE,
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX voters_email_idx           ON voters(email);
CREATE INDEX voters_email_verified_idx  ON voters(email_verified);
```

### Migration 2 — Update otp_requests for email support

```sql
ALTER TABLE otp_requests
  ALTER COLUMN phone DROP NOT NULL,       -- phone was implicitly required before
  ADD COLUMN email   VARCHAR(255),
  ADD COLUMN purpose VARCHAR(30) NOT NULL DEFAULT 'VOTE';

CREATE INDEX otp_requests_email_sent_idx        ON otp_requests(email, sent_at);
CREATE INDEX otp_requests_email_verified_idx    ON otp_requests(email, verified, expires_at);
```

### Migration 3 — Add email_logs table

```sql
CREATE TABLE email_logs (
  id             SERIAL PRIMARY KEY,
  "to"           VARCHAR(255) NOT NULL,
  subject        VARCHAR(255) NOT NULL,
  resend_id      VARCHAR(100) UNIQUE,
  status         VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
  failure_reason TEXT,
  sent_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX email_logs_to_idx       ON email_logs("to");
CREATE INDEX email_logs_status_idx   ON email_logs(status);
CREATE INDEX email_logs_sent_at_idx  ON email_logs(sent_at);
```

These map to Prisma migration files generated via `npx prisma migrate dev --name <name>`.

---

## 17. Deprecations & Cleanup

### `lib/sms.ts`

- Remove the import from `lib/otp.ts`.
- Keep the file itself (do not delete yet) — it is still used by:
  - `app/api/webhooks/sms/delivery-report/route.ts` (may be removed later)
  - The Africa's Talking webhook can be decommissioned once SMS is fully off.
- Add a `@deprecated` JSDoc comment to the file header.

### `app/api/webhooks/sms/delivery-report/route.ts`

- Decommission after confirming no pending AT SMS logs need updating.
- This route can be left as a no-op stub initially, then deleted in a follow-up PR.

### `africastalking` npm package

After fully confirmed migration:
```bash
npm uninstall africastalking
```
Remove from `package.json` and `@types/africastalking` from devDependencies.

---

## 18. Implementation Checklist

Work through these in order. Each task should be a separate commit/PR.

### Database & Schema
- [ ] Write Prisma migration 1: add `email`, `emailVerified` to `Voter`
- [ ] Write Prisma migration 2: update `OtpRequest` (`phone` nullable, add `email`, add `purpose`)
- [ ] Write Prisma migration 3: create `EmailLog` model
- [ ] Run `npx prisma migrate dev` for all three
- [ ] Run `npx prisma generate`

### Email Library
- [ ] Install `resend` package
- [ ] Create `lib/email.ts` with `sendEmail`, `sendEmailOTP`, `sendEmailVerificationOTP`, `tryEmailSend`, `maskEmail`
- [ ] Build HTML template: **OTP vote-day** (subject, full HTML, inline styles)
- [ ] Build HTML template: **Email verification** (subject, full HTML, inline styles)
- [ ] Build HTML template: **Vote confirmation** (subject, full HTML, inline styles)
- [ ] Test simulation mode (no `RESEND_API_KEY`) — should log to console and write `SIMULATED` to DB
- [ ] Test live mode with a real Resend API key against your domain

### OTP Library Refactor
- [ ] Update `sendOTP(phone, voterEmail, ipAddress)` signature — remove `sendSMS`, add `sendEmailOTP`
- [ ] Add `sendEmailRegistrationOTP(email, phone, ipAddress)` function
- [ ] Add `verifyOTPByEmail(email, code)` function
- [ ] Add `getOTPRateLimitStateByEmail(email, ipAddress)` function

### Phase A — Email Registration API
- [ ] Create `app/api/voter/register-email/route.ts`
- [ ] Create `app/api/voter/register-email/verify/route.ts`
- [ ] Add uniqueness check: reject if email already belongs to another verified voter
- [ ] Write integration tests (manually test all error states)

### Phase B — Vote Auth API
- [ ] Modify `app/api/vote/auth/request-otp/route.ts`: add `emailVerified` guard, pass email to `sendOTP`, return `maskedEmail`
- [ ] Confirm `app/api/vote/auth/verify-otp/route.ts` requires no changes

### Admin API
- [ ] Update `GET /api/admin/voters` to return `email` + `emailVerified`
- [ ] Update `PATCH /api/admin/voters/[id]` to accept `email`, reset `emailVerified`, log audit
- [ ] Update `POST /api/admin/voters/bulk` to parse and validate optional `email` CSV column

### Frontend — New
- [ ] Create `app/(public)/register-email/page.tsx`
- [ ] Create `components/voter/EmailRegistrationCard.tsx` (4-step: PHONE → EMAIL_ENTRY → OTP_VERIFY → SUCCESS)

### Frontend — Modified
- [ ] Update `AuthCard.tsx`: show `maskedEmail` after OTP dispatch; add "no verified email" CTA
- [ ] Update `components/admin/AddVoterModal.tsx`: add email field
- [ ] Update `components/admin/VoterImportModal.tsx`: document `email` CSV column
- [ ] Update admin voters page: add Email + Email Status columns + TypeScript interface

### Environment & Config
- [ ] Add `RESEND_API_KEY` and `RESEND_FROM` to `.env.local` and production environment
- [ ] Add `EMAIL_REG_OTP_TTL_SECONDS=600` to environment
- [ ] Comment out (do not delete yet) `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID`

### Cleanup (final PR after full validation)
- [ ] Deprecate `lib/sms.ts` with JSDoc comment
- [ ] Decommission `app/api/webhooks/sms/delivery-report/route.ts`
- [ ] Uninstall `africastalking` and `@types/africastalking`
- [ ] Delete or archive `scratch/test-sms.ts`

---

*Plan authored for `ELC_IEC_mu-main` · April 2026*