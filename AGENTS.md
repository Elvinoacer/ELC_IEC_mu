# Equity Leaders Program — Moi Chapter
# Voting System — Full Requirements Specification

> **Stack:** Next.js (App Router) · Node.js (Express) · PostgreSQL · Socket.IO · Africa's Talking SMS API  
> **Version:** 1.0 | **Classification:** Internal / IEC Use Only

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Database Schema](#3-database-schema)
4. [User Roles](#4-user-roles)
5. [Voter Registration & Phone Management](#5-voter-registration--phone-management)
6. [Candidate Registration Flow](#6-candidate-registration-flow)
7. [Admin — Candidate Verification](#7-admin--candidate-verification)
8. [Voter Authentication Flow](#8-voter-authentication-flow)
9. [Device Fingerprinting](#9-device-fingerprinting)
10. [Voting Flow](#10-voting-flow)
11. [Real-Time Results (Socket.IO)](#11-real-time-results-socketio)
12. [Africa's Talking SMS Integration](#12-africas-talking-sms-integration)
13. [Pages & Routes](#13-pages--routes)
14. [API Endpoints](#14-api-endpoints)
15. [File Uploads](#15-file-uploads)
16. [Security Checklist](#16-security-checklist)
17. [Environment Variables](#17-environment-variables)
18. [Voting Window Configuration](#18-voting-window-configuration)
19. [Error States & Edge Cases](#19-error-states--edge-cases)
20. [Cost Estimate](#20-cost-estimate)

---

## 1. System Overview

A closed, end-to-end web-based voting platform for the Equity Leaders Program (ELP) Moi Chapter. The system covers three distinct journeys:

- **Candidates** register themselves via a public form. An admin reviews and approves or rejects each candidate before they appear to voters.
- **Voters** authenticate using their registered phone number + SMS OTP + device fingerprint check, then cast one vote per position.
- **The IEC (Admin)** manages the voter registry, approves candidates, monitors live results, and controls the voting window.

All data lives in a PostgreSQL database. Real-time vote updates are pushed to all connected clients via Socket.IO. SMS OTPs are delivered via Africa's Talking.

---

## 2. Tech Stack & Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                     │
│  Next.js App Router · Tailwind CSS · Socket.IO Client   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS + WSS
┌────────────────────▼────────────────────────────────────┐
│               NODE.JS SERVER                            │
│  Express · Next.js API Routes · Socket.IO Server        │
│  JWT (httpOnly cookies) · express-rate-limit            │
└──────┬───────────────────┬───────────────────┬──────────┘
       │                   │                   │
┌──────▼──────┐   ┌────────▼───────┐  ┌───────▼────────┐
│ PostgreSQL  │   │  Africa's      │  │  File Storage  │
│  (Database) │   │  Talking SMS   │  │  (Cloudinary / │
│             │   │  (OTP Delivery)│  │   local /public│
└─────────────┘   └────────────────┘  └────────────────┘
```

### Key decisions

| Concern | Choice | Reason |
|---|---|---|
| Database | PostgreSQL | Relational, supports transactions, prevents double-votes at DB level |
| Real-time | Socket.IO | Bi-directional, works over WSS, easy Next.js integration |
| Auth | JWT + httpOnly cookie | Stateless, secure, no client-side token exposure |
| OTP | Africa's Talking SMS | Kenya-native, ~KES 1/SMS, reliable on Safaricom & Airtel |
| File uploads | Cloudinary (or local) | Candidate photos; CDN delivery, no server disk dependency |
| ORM | Prisma | Type-safe queries, easy migrations, works great with Next.js |

---

## 3. Database Schema

### 3.1 `voters` table

Stores every phone number the IEC has pre-registered as eligible to vote.

```sql
CREATE TABLE voters (
  id             SERIAL PRIMARY KEY,
  phone          VARCHAR(20)  NOT NULL UNIQUE,  -- E.164 format: +2547XXXXXXXX
  name           VARCHAR(100),                  -- optional, for IEC reference only
  has_voted      BOOLEAN      NOT NULL DEFAULT FALSE,
  voted_at       TIMESTAMPTZ,
  device_hash    VARCHAR(64),                   -- SHA-256 of device fingerprint, set on first vote
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  added_by       INTEGER      REFERENCES admins(id)  -- which admin added this voter
);
```

### 3.2 `candidates` table

```sql
CREATE TABLE candidates (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100)  NOT NULL,
  phone           VARCHAR(20)   NOT NULL UNIQUE,  -- must exist in voters table
  school          VARCHAR(150)  NOT NULL,
  year_of_study   VARCHAR(50)   NOT NULL,         -- e.g. "3rd Year"
  position        VARCHAR(100)  NOT NULL,         -- e.g. "Chairperson"
  scholar_code    VARCHAR(50)   NOT NULL UNIQUE,  -- PF number / scholar code
  photo_url       TEXT          NOT NULL,         -- Cloudinary URL or /uploads/...
  status          VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
                  -- PENDING | APPROVED | REJECTED
  rejection_note  TEXT,                           -- IEC note if rejected
  votes           INTEGER       NOT NULL DEFAULT 0,
  submitted_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     INTEGER       REFERENCES admins(id)
);
```

### 3.3 `votes` table

```sql
CREATE TABLE votes (
  id           SERIAL PRIMARY KEY,
  voter_id     INTEGER  NOT NULL REFERENCES voters(id),
  candidate_id INTEGER  NOT NULL REFERENCES candidates(id),
  position     VARCHAR(100) NOT NULL,
  cast_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(voter_id, position)  -- one vote per position per voter, enforced at DB level
);
```

### 3.4 `admins` table

```sql
CREATE TABLE admins (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
  role         VARCHAR(20)  NOT NULL DEFAULT 'IEC',  -- IEC | SUPER_ADMIN
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### 3.5 `otp_requests` table

Tracks OTP sends for rate-limiting and audit.

```sql
CREATE TABLE otp_requests (
  id         SERIAL PRIMARY KEY,
  phone      VARCHAR(20)  NOT NULL,
  sent_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  verified   BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ  NOT NULL
);
```

### 3.6 `voting_config` table

```sql
CREATE TABLE voting_config (
  id          SERIAL PRIMARY KEY,
  opens_at    TIMESTAMPTZ NOT NULL,
  closes_at   TIMESTAMPTZ NOT NULL,
  is_manually_closed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  INTEGER REFERENCES admins(id)
);
```

### 3.7 `positions` table

Defines the election positions and their display order.

```sql
CREATE TABLE positions (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(100) NOT NULL UNIQUE,  -- e.g. "Chairperson"
  display_order INTEGER NOT NULL DEFAULT 0
);
```

---

## 4. User Roles

| Role | Access |
|---|---|
| **Candidate (applicant)** | Public registration form only. No login. Receives status SMS. |
| **Voter** | Login via OTP. View approved candidates. Cast one vote per position. View live results after voting. |
| **IEC Admin** | Full dashboard: manage voter registry, approve/reject candidates, view results, control voting window, export data. |
| **Super Admin** | Everything IEC can do + manage admin accounts. |

---

## 5. Voter Registration & Phone Management

The IEC enters all eligible voter phone numbers into the system before voting opens. Voters do **not** self-register.

### 5.1 Admin — Add Voters

**Single entry**
- Admin fills a form: Phone number, Name (optional), and submits.
- System normalises the number to E.164 (`+2547XXXXXXXX`).
- Checks for duplicates — rejects if number already exists.
- Saves to `voters` table with `has_voted = false`.

**Bulk upload (CSV)**
- Admin uploads a `.csv` file with columns: `phone`, `name` (name column is optional).
- System validates each row: correct format, no duplicates within the file, no duplicates in the DB.
- Displays a preview table showing valid rows (green) and invalid/duplicate rows (red) before committing.
- On confirm, inserts all valid rows in a single transaction.
- Generates an import summary: `X added, Y skipped (duplicates), Z invalid`.

**CSV format expected:**
```csv
phone,name
0712345678,Jane Doe
0722000001,John Otieno
+254733000002,Alice Wanjiru
```

### 5.2 Admin — View & Manage Voters

- Paginated table of all voters: phone, name, has_voted, voted_at, device registered.
- Search by phone number or name.
- Delete a voter (only if `has_voted = false`).
- Edit name field.
- Export full voter list as CSV.
- **Reset a voter** (IEC-only, audit-logged): sets `has_voted = false`, clears `device_hash` and `voted_at`. Used for genuine errors only.

### 5.3 Voter Count Display

Admin dashboard shows at all times:
- Total registered voters
- Total who have voted
- Total remaining
- Percentage turnout

---

## 6. Candidate Registration Flow

Candidates submit their own information via a **public-facing registration page**. No login required. The IEC reviews submissions before they go live.

### 6.1 Registration Form Fields

| Field | Type | Validation |
|---|---|---|
| Full Name | Text | Required, 2–100 characters |
| Phone Number | Tel | Required. Must exist in the `voters` table. Must not already have a pending/approved candidacy. |
| School / Campus | Text | Required, 2–150 characters |
| Year of Study | Select | Required. Options: 1st Year, 2nd Year, 3rd Year, 4th Year, 5th Year, Postgraduate |
| Position Running For | Select | Required. Populated from `positions` table |
| Scholar Code / PF Number | Text | Required. Must be unique across all candidates. |
| Candidate Photo | File upload | Required. JPEG/PNG only. Max 2MB. |

### 6.2 Phone Verification During Registration

Before the form can be submitted, the candidate's phone number must be verified with an OTP. This ensures:
- The phone number belongs to the person filling the form.
- The phone number is in the voter registry (only registered voters can run as candidates).

**Sub-flow:**
1. Candidate enters phone number → clicks **"Send Verification Code"**.
2. System checks: does this number exist in `voters`? If not → error: *"This phone number is not registered in the ELP voter registry."*
3. If registered, AT sends a 6-digit OTP to that number.
4. Candidate enters OTP → system verifies → phone is marked as verified for this session.
5. Full form becomes submittable only after phone is verified.

### 6.3 Scholar Code / PF Number Validation

- The scholar code field is validated on blur (as the user leaves the field) by calling a lightweight API endpoint.
- The API checks: is this scholar code already in use by another candidate?
- If duplicate → show inline error before form submission.
- On final submit, a second uniqueness check is done server-side to prevent race conditions.

### 6.4 Photo Upload

- Accepted: `.jpg`, `.jpeg`, `.png`.
- Max size: 2MB.
- Client-side preview before submission (so candidate can confirm it looks right).
- Uploaded to Cloudinary (or stored in `/public/uploads/candidates/` if using local storage).
- The `photo_url` stored in the DB points to the final hosted URL.

### 6.5 Submission Outcome

On successful submission:
- Record is saved to `candidates` table with `status = 'PENDING'`.
- Candidate sees a confirmation screen: *"Your application has been received. You will be notified via SMS once the IEC has reviewed it."*
- AT SMS is sent to the candidate's phone: *"ELP Moi Chapter: Your candidacy application for [Position] has been received. You will be notified once reviewed by the IEC."*

### 6.6 Re-submission Prevention

- A phone number that has an existing `PENDING` or `APPROVED` candidacy cannot submit a new application for the same position.
- A phone number with a `REJECTED` candidacy **can** resubmit after correction (within the registration window).

### 6.7 Registration Window

Candidate registration is only open during a configurable window (set separately from the voting window in `voting_config`). Outside this window, the registration page shows a *"Registration is closed"* message.

---

## 7. Admin — Candidate Verification

### 7.1 Candidate Review Dashboard

The IEC admin sees a list of all candidates grouped by status: **Pending**, **Approved**, **Rejected**.

Each card shows:
- Candidate photo
- Full name, phone, school, year, position, scholar code
- Date/time of submission
- Action buttons: **Approve** | **Reject**

### 7.2 Approve a Candidate

- Admin clicks **Approve**.
- `candidates.status` is set to `APPROVED`.
- `reviewed_at` and `reviewed_by` are recorded.
- AT SMS is sent to the candidate: *"ELP Moi Chapter: Congratulations! Your candidacy for [Position] has been APPROVED. You will appear on the ballot."*
- Candidate now appears on the voter-facing ballot page immediately (no server restart needed — it is a live DB query).

### 7.3 Reject a Candidate

- Admin clicks **Reject** → a modal appears asking for a rejection reason (required, free text).
- `candidates.status` is set to `REJECTED`, `rejection_note` is saved.
- AT SMS is sent to the candidate: *"ELP Moi Chapter: Your candidacy for [Position] has not been approved. Reason: [rejection_note]. Contact the IEC for clarification."*

### 7.4 Edit a Candidate's Details (Pre-Approval)

Before approving, the admin can edit any field (e.g. fix a typo in the name or correct the position). All edits are logged.

### 7.5 Candidate Appears to Voters

The voter-facing ballot page only shows candidates where `status = 'APPROVED'`. The query is live — approvals reflect instantly.

---

## 8. Voter Authentication Flow

Voters access the system via a shared link. Authentication is a two-step process: phone number + OTP.

### 8.1 Step 1 — Enter Phone Number

1. Voter lands on `/` and sees only a phone number input field.
2. On submit:
   - Normalise the number to E.164.
   - Query `voters` table: does this number exist?
     - No → error: *"This number is not registered to vote."*
   - Does `has_voted = true`?
     - Yes → redirect to `/results` (view-only mode). Message: *"You have already cast your vote. Here are the live results."*
   - Number is valid and has not voted → proceed to OTP step.
3. System sends OTP via Africa's Talking to the phone number.
4. Voter is shown the OTP entry screen.

### 8.2 Step 2 — Enter OTP

1. Voter enters the 6-digit OTP.
2. Server looks up the most recent un-verified, un-expired `otp_requests` record for that phone.
3. Validates:
   - Not expired (`expires_at > NOW()`).
   - Code matches.
   - Not exceeded max attempts (3 wrong guesses invalidates the OTP).
4. On success:
   - Mark OTP record as `verified = true`.
   - **Run device fingerprint check** (see Section 9).
   - Issue a signed JWT stored in an `httpOnly` cookie (15-minute TTL).
   - Redirect to `/vote`.
5. On failure → show appropriate error with option to request a new OTP.

### 8.3 Resend OTP

- Voter can request a new OTP.
- Rate limited: max 5 OTP requests per phone number per hour (checked against `otp_requests` table count).
- New OTP invalidates any previous un-verified OTP for that phone.

---

## 9. Device Fingerprinting

Device fingerprinting is the **second layer** of protection, applied after OTP verification. The phone number + `has_voted` flag is the primary lock. Device fingerprinting prevents a voter from sharing their OTP with someone else on a different device.

### 9.1 Fingerprint Generation (Client-Side)

Generated in the browser using a combination of signals, then hashed client-side with SHA-256 (Web Crypto API):

```
signals:
  - navigator.userAgent
  - screen.width + screen.height + screen.colorDepth
  - navigator.language
  - navigator.hardwareConcurrency
  - Intl.DateTimeFormat().resolvedOptions().timeZone
  - Canvas fingerprint (draw to canvas, export as data URL, hash)
```

The resulting SHA-256 hash is sent to the server **alongside** the OTP verification request.

### 9.2 Server-Side Device Check

When the OTP is successfully verified, the server runs this check using the submitted `device_hash`:

```
1. Look up the voter record.
2. Is voter.device_hash NULL?
   → This is the voter's first authenticated session.
   → Store the device_hash on the voter record.
   → Allow through to /vote.

3. Is voter.device_hash === submitted device_hash?
   → Same device. Allow through.

4. Is voter.device_hash !== submitted device_hash AND voter.has_voted = false?
   → Different device, hasn't voted yet.
   → This could be the voter on a new device (e.g. switched phones).
   → Present a warning screen:
     "A different device was previously used to start this session.
      If this is you, click Continue. If not, contact the IEC immediately."
   → Allow voter to continue (do not hard-block — the OTP already proved identity).
   → Update device_hash to the new value.

5. Is voter.device_hash !== submitted device_hash AND voter.has_voted = true?
   → Voted from a different device. This is just a view attempt.
   → Redirect to /results (view-only). This is expected and fine.
```

> **Note:** Hard-blocking on device mismatch would cause false denials (e.g. voter cleared browser data, switched phone). The OTP is the hard gate. Device hash is the soft gate — it deters without causing innocent lockouts.

### 9.3 Post-Vote Device Lock

After a vote is successfully cast:
- `voters.device_hash` is permanently stored.
- `voters.has_voted = true`.
- From this point, no device can vote on behalf of this number — the `has_voted` check at Step 1 of auth will always redirect to results.

---

## 10. Voting Flow

### 10.1 Ballot Page (`/vote`)

- Protected route. Requires a valid `vote_session` JWT cookie.
- Server-side, decodes JWT to get the voter's phone, queries `voters` table to confirm `has_voted = false`. If `has_voted = true`, redirect to `/results`.
- Page fetches all `APPROVED` candidates, grouped by position in display order.
- Each position section shows candidate cards: photo, name, school, year.
- Voter selects **one candidate per position**.
- All positions must have a selection before submission is enabled (a voter cannot skip a position).
- Submit button triggers a confirmation modal: *"You are about to cast your final vote. This cannot be changed. Confirm?"*

### 10.2 Vote Submission

`POST /api/vote`

Server-side logic on receipt:

```
1. Validate JWT cookie → extract phone.
2. Begin DB transaction.
3. SELECT voter WHERE phone = ? FOR UPDATE  → row-level lock.
4. If has_voted = true → abort, return 409 Conflict.
5. Validate each submitted candidate_id:
   - Exists in DB.
   - Status = APPROVED.
   - Position matches what was submitted.
6. Insert one row into votes per position.
   - UNIQUE(voter_id, position) constraint catches any race condition duplicate.
7. UPDATE voters SET has_voted = true, voted_at = NOW(), device_hash = ?
8. UPDATE candidates SET votes = votes + 1 WHERE id IN (submitted ids)
9. Commit transaction.
10. Emit Socket.IO event: 'vote_cast' with updated results payload.
11. Return 200 { ok: true }.
```

### 10.3 After Voting

- Voter is redirected to `/results`.
- Results page shows live vote counts for all positions.
- Voter cannot return to `/vote` — JWT check + `has_voted` flag both block it.

---

## 11. Real-Time Results (Socket.IO)

### 11.1 Setup

Socket.IO server runs alongside the Express/Node.js server. Next.js frontend connects as a Socket.IO client on the results page and on the admin dashboard.

```
Server port: same as Express (e.g. 3001 for the API server)
Namespace:   /results
```

### 11.2 Event: `vote_cast`

Emitted by the server to **all connected clients** every time a vote is successfully cast.

**Payload:**

```json
{
  "positions": [
    {
      "position": "Chairperson",
      "candidates": [
        {
          "id": 1,
          "name": "Jane Doe",
          "photo_url": "https://...",
          "school": "Moi University Main",
          "year": "3rd Year",
          "votes": 42,
          "percentage": 38.5
        }
      ],
      "total_votes_for_position": 109
    }
  ],
  "global": {
    "total_eligible": 350,
    "total_cast": 121,
    "remaining": 229,
    "turnout_percentage": 34.6
  }
}
```

### 11.3 Results Page Behaviour

- On page load, fetches a snapshot via `GET /api/results` (for initial render).
- Connects to Socket.IO and subscribes to `vote_cast` events.
- On each event, updates state → animated progress bars update live.
- **Leading candidate** per position is highlighted.
- Accessible to anyone with the link — no authentication required to view results.

### 11.4 Heartbeat

Server emits a `heartbeat` event every 30 seconds so clients can detect connection drops and reconnect.

---

## 12. Africa's Talking SMS Integration

### 12.1 When SMS is Sent

| Trigger | Recipient | Message |
|---|---|---|
| Voter requests OTP | Voter | `Your ELP Moi Chapter voting OTP is: XXXXXX. Valid 5 minutes. Do not share.` |
| Candidate submits application | Candidate | `Your candidacy for [Position] has been received. You will be notified once reviewed.` |
| Admin approves candidate | Candidate | `Congratulations! Your candidacy for [Position] has been APPROVED. You will appear on the ballot.` |
| Admin rejects candidate | Candidate | `Your candidacy for [Position] was not approved. Reason: [note]. Contact the IEC.` |
| Voter casts a vote | Voter | `Your vote has been successfully cast. Thank you for participating in ELP Moi Chapter elections.` |

### 12.2 SDK Initialisation

```typescript
// lib/sms.ts
import AfricasTalking from 'africastalking';

const at = AfricasTalking({
  apiKey:   process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!,
});

export const sms = at.SMS;

export async function sendSMS(to: string, message: string): Promise<void> {
  await sms.send({
    to,
    message,
    from: process.env.AT_SENDER_ID!,
  });
}
```

### 12.3 OTP Service

```typescript
// lib/otp.ts
import { sendSMS }  from './sms';
import { prisma }   from './prisma';

const OTP_TTL_MS = Number(process.env.OTP_TTL_SECONDS ?? 300) * 1000;

function generateCode(digits = 6): string {
  return String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
}

export async function sendOTP(phone: string): Promise<void> {
  const code      = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpRequest.create({
    data: { phone, code, expiresAt, verified: false }
  });

  await sendSMS(phone, `Your ELP Moi Chapter voting OTP is: ${code}. Valid for 5 minutes. Do not share.`);
}

export async function verifyOTP(
  phone: string,
  code: string
): Promise<'ok' | 'expired' | 'wrong' | 'locked'> {
  // Count recent failed attempts
  const attempts = await prisma.otpRequest.count({
    where: {
      phone,
      verified: false,
      expiresAt: { gt: new Date() },
      code: { not: code }    // wrong code attempts
    }
  });
  if (attempts >= 3) return 'locked';

  const record = await prisma.otpRequest.findFirst({
    where: { phone, verified: false, expiresAt: { gt: new Date() } },
    orderBy: { sentAt: 'desc' }
  });

  if (!record)           return 'expired';
  if (record.code !== code) return 'wrong';

  await prisma.otpRequest.update({
    where: { id: record.id },
    data:  { verified: true }
  });

  return 'ok';
}
```

### 12.4 Delivery Report Webhook

```typescript
// app/api/at/delivery/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body   = await req.text();
  const params = new URLSearchParams(body);

  const status = params.get('status');       // Success | Failed | Buffered
  const phone  = params.get('phoneNumber');
  const msgId  = params.get('id');

  console.log(`[AT] ${msgId} → ${phone}: ${status}`);
  // Optionally log to DB for audit trail

  return NextResponse.json({ ok: true });
}
```

---

## 13. Pages & Routes

### Public Routes (No Auth)

| Route | Purpose |
|---|---|
| `/` | Phone number entry (start of voter auth) |
| `/verify-otp` | OTP entry screen |
| `/register-candidate` | Candidate self-registration form |
| `/register-candidate/submitted` | Confirmation screen after candidate submits |
| `/results` | Live results — public, read-only |
| `/closed` | Shown when voting window is not active |
| `/not-registered` | Shown when phone is not in voter registry |

### Protected Routes (Voter — JWT Required)

| Route | Purpose |
|---|---|
| `/vote` | Ballot page — cast votes |
| `/vote/confirmed` | Post-vote confirmation |

### Admin Routes (Admin Session Required)

| Route | Purpose |
|---|---|
| `/admin` | Login page |
| `/admin/dashboard` | Overview stats |
| `/admin/voters` | View, add, bulk-upload, manage voter registry |
| `/admin/voters/add` | Single voter add form |
| `/admin/voters/import` | CSV bulk import |
| `/admin/candidates` | Review pending/approved/rejected candidates |
| `/admin/candidates/[id]` | Individual candidate detail & review action |
| `/admin/results` | Full live results with all data |
| `/admin/config` | Set voting window open/close times |
| `/admin/config/positions` | Manage election positions |
| `/admin/export` | Export votes / voter list as CSV |

---

## 14. API Endpoints

### Auth

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/request-otp` | Public | Check registry, send OTP |
| `POST` | `/api/auth/verify-otp` | Public | Verify OTP + device hash, issue JWT |
| `POST` | `/api/auth/logout` | Voter JWT | Clear cookie |

### Candidates

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/candidates/register` | Public | Submit candidate application |
| `GET` | `/api/candidates/check-scholar` | Public | Check if scholar code is already used |
| `GET` | `/api/candidates` | Public | Get all APPROVED candidates (grouped by position) |
| `GET` | `/api/admin/candidates` | Admin | Get all candidates with all statuses |
| `PATCH` | `/api/admin/candidates/[id]/approve` | Admin | Approve a candidate |
| `PATCH` | `/api/admin/candidates/[id]/reject` | Admin | Reject with reason |
| `PATCH` | `/api/admin/candidates/[id]` | Admin | Edit candidate details |

### Voters

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/voters` | Admin | Paginated voter list |
| `POST` | `/api/admin/voters` | Admin | Add single voter |
| `POST` | `/api/admin/voters/import` | Admin | Bulk CSV import |
| `DELETE` | `/api/admin/voters/[id]` | Admin | Remove voter (only if not voted) |
| `PATCH` | `/api/admin/voters/[id]/reset` | Admin | Reset voter (audit-logged) |

### Voting

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/vote` | Voter JWT | Submit votes |
| `GET` | `/api/results` | Public | Snapshot of current results |
| `GET` | `/api/status` | Public | Voting window open/closed |

### Admin Config

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/admin/auth` | Public | Admin login |
| `GET` | `/api/admin/config` | Admin | Get voting config |
| `PATCH` | `/api/admin/config` | Admin | Update voting window |
| `POST` | `/api/admin/config/close` | Admin | Manually close voting |
| `GET` | `/api/admin/export/votes` | Admin | CSV export of results |
| `GET` | `/api/admin/export/voters` | Admin | CSV export of voter list |

### Webhooks

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/at/delivery` | None (AT callback) | Receive SMS delivery reports |

---

## 15. File Uploads

### 15.1 Candidate Photos

- Client validates: file type (jpg/png), file size (max 2MB) before upload.
- Upload endpoint: `POST /api/upload/candidate-photo`
- Server re-validates type and size.
- If using **Cloudinary**: upload via Cloudinary Node SDK, store returned `secure_url`.
- If using **local storage**: save to `/public/uploads/candidates/{uuid}.jpg`, store relative path.
- Return the `photo_url` to the client, which embeds it in the candidate registration form payload.

### 15.2 Storage Recommendation

Use **Cloudinary free tier** (25GB storage / 25GB bandwidth per month — more than enough for a single election). Avoids serving images from the app server and survives server restarts.

---

## 16. Security Checklist

### Authentication & Session
- [ ] JWT signed with `JWT_SECRET` from environment (never hardcoded)
- [ ] JWT stored in `httpOnly`, `Secure`, `SameSite=strict` cookie
- [ ] JWT TTL: 15 minutes (voter session is short-lived by design)
- [ ] Admin session uses separate JWT with different secret
- [ ] Admin password stored as `bcrypt` hash (min 12 rounds)

### Voting Integrity
- [ ] `UNIQUE(voter_id, position)` constraint in `votes` table — DB-level double-vote prevention
- [ ] Row-level lock (`SELECT FOR UPDATE`) on voter record during vote submission
- [ ] `has_voted` checked server-side on every access to `/vote` page
- [ ] JWT re-validated on `POST /api/vote` (not just on page load)
- [ ] Device hash re-submitted and re-checked on vote submission

### OTP & SMS
- [ ] OTP TTL: 5 minutes
- [ ] Max 3 wrong OTP attempts before invalidation
- [ ] Max 5 OTP requests per phone per hour (DB-level check on `otp_requests`)
- [ ] OTP codes are never logged in plain text in production

### API Hardening
- [ ] Rate limiting on `POST /api/auth/request-otp`: 5 requests per IP per minute
- [ ] Rate limiting on `POST /api/auth/verify-otp`: 10 requests per IP per minute
- [ ] Rate limiting on `POST /api/vote`: 3 requests per IP per minute
- [ ] CORS locked to your production domain only
- [ ] All admin routes protected by admin JWT middleware
- [ ] Phone numbers never returned in client-facing API responses

### Proxy / VPN Deterrence
- [ ] On `POST /api/auth/request-otp`, inspect `X-Forwarded-For`, `Via`, `X-Proxy-Id` headers
- [ ] Optional: call ip-api.com `?fields=proxy,hosting` to check voter IP at OTP request time
- [ ] Soft-block (warn and log) rather than hard-block to avoid false positives on Kenyan mobile NAT IPs

### Infrastructure
- [ ] HTTPS enforced in production (`Secure` flag on cookies)
- [ ] `.env` / `.env.local` never committed to Git (in `.gitignore`)
- [ ] Database connection string in environment only
- [ ] Cloudinary API key in environment only
- [ ] File upload endpoint validates both MIME type and file magic bytes (not just extension)

---

## 17. Environment Variables

```bash
# ── Database ──────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/elp_voting

# ── Africa's Talking ─────────────────────────────────────────
AT_API_KEY=your_api_key
AT_USERNAME=sandbox                    # → your username in production
AT_SENDER_ID=Sandbox                   # → approved Sender ID in production

# ── OTP ──────────────────────────────────────────────────────
OTP_TTL_SECONDS=300
OTP_DIGITS=6
OTP_MAX_ATTEMPTS=3
OTP_MAX_PER_HOUR=5

# ── JWT ──────────────────────────────────────────────────────
JWT_SECRET=long_random_secret_for_voters
JWT_TTL=900
ADMIN_JWT_SECRET=different_long_random_secret_for_admins
ADMIN_JWT_TTL=3600

# ── Cloudinary (file uploads) ─────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# ── Socket.IO ────────────────────────────────────────────────
SOCKET_CORS_ORIGIN=https://yourdomain.com

# ── App ──────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=development                   # → production in production
PORT=3001
```

---

## 18. Voting Window Configuration

The voting window is stored in the `voting_config` table and checked on every relevant API call.

### 18.1 States

| State | Condition | What voters see |
|---|---|---|
| **Not yet open** | `NOW() < opens_at` | `/closed` page: "Voting opens on [date/time]" |
| **Open** | `opens_at <= NOW() <= closes_at` AND `is_manually_closed = false` | Normal auth and vote flow |
| **Closed (time)** | `NOW() > closes_at` | `/closed` page: "Voting has ended. View results." |
| **Closed (manual)** | `is_manually_closed = true` | `/closed` page: "Voting has been closed by the IEC." |

### 18.2 Admin Controls

- Set `opens_at` and `closes_at` via the admin config page.
- **Emergency close** button: sets `is_manually_closed = true` immediately.
- **Reopen** button (Super Admin only): sets `is_manually_closed = false`.
- All changes are timestamped and attributed to the admin who made them.

### 18.3 Candidate Registration Window

Managed separately with `candidate_reg_opens_at` and `candidate_reg_closes_at` columns in `voting_config`. The candidate registration form respects this window independently of the voting window.

---

## 19. Error States & Edge Cases

| Scenario | System Behaviour |
|---|---|
| Voter enters unregistered phone | Error: "This number is not registered to vote." No OTP sent. |
| Voter has already voted | Skip auth entirely → redirect to `/results` with message. |
| OTP expired | Error with "Request a new code" button. |
| OTP wrong (3× attempts) | OTP invalidated. Voter must request a new one. |
| Vote submitted after JWT expires | 401 → redirect to `/`. Voter must re-authenticate (OTP again). |
| Vote submitted after `closes_at` | 403 → "Voting has closed." Vote is not recorded. |
| DB transaction fails on vote | 500 → "An error occurred. Your vote was not recorded. Please try again." The transaction rolls back — no partial votes. |
| Same voter sends two vote submissions simultaneously | `SELECT FOR UPDATE` + `UNIQUE` constraint → one succeeds, one gets a 409. |
| Candidate submits with already-used scholar code | Inline error before submission. Server-side uniqueness check on submit. |
| Candidate phone not in voter registry | OTP step blocked: "This number is not in the ELP voter registry." |
| Candidate already has PENDING/APPROVED application for same position | Error: "An application for this position already exists for this phone number." |
| Server restarts during voting window | Voters who haven't voted yet can still vote — `has_voted` is in DB, not memory. OTP re-request needed if mid-flow. |
| AT SMS delivery fails (statusCode 402/405) | Log error, return 500 to client with "Could not send OTP. Please contact the IEC." |

---

## 20. Cost Estimate (Kenya)

### SMS Costs (~KES 1 per message)

| Event | Messages per voter/candidate | 300 Voters | 500 Voters |
|---|---|---|---|
| OTP (1.2× for re-requests) | 1.2 | 360 | 600 |
| Vote confirmation SMS | 1 | 300 | 500 |
| Candidate application received | 1 per candidate | — | — |
| Candidate approval/rejection | 1 per candidate | — | — |
| **Subtotal (voters)** | | **KES 660** | **KES 1,100** |
| **Add 20 candidates (4 SMS each)** | | **KES 80** | **KES 80** |
| **Total estimate** | | **~KES 750** | **~KES 1,200** |

**Recommended AT account top-up:** KES 1,500–2,000 for up to 500 voters + candidates. Always top up **before** opening registration or voting.

### Sender ID Registration (One-time, Production)

| Provider | Cost |
|---|---|
| Safaricom | KES 7,000 |
| Airtel | KES 7,000 |
| **Both (recommended)** | **KES 14,000** |

> ⚠️ Apply for the Sender ID at least **2 weeks before** the election date. Approval can take 3–7 business days and may require back-and-forth with the telecom.

---

## Complete System Flow Summary

```
CANDIDATE JOURNEY
─────────────────
Opens /register-candidate
  → Enters phone → OTP sent → OTP verified (phone in voters table check)
  → Fills form (name, school, year, position, scholar code, photo)
  → Submits → status = PENDING → confirmation SMS sent
  → Admin reviews → APPROVED or REJECTED → SMS notification sent
  → If APPROVED: candidate appears on ballot immediately


VOTER JOURNEY
─────────────
Opens / (shared link)
  → Enters phone
      ├── Not in registry        → "Not registered" screen
      └── In registry
            ├── has_voted = true → /results (view only)
            └── has_voted = false
                  → OTP sent via AT SMS
                  → Enters OTP
                        ├── Wrong/expired → error + retry
                        └── Correct
                              → Device fingerprint check
                              → JWT issued (httpOnly cookie)
                              → /vote (ballot page)
                                    → Selects one candidate per position
                                    → Confirms
                                    → POST /api/vote (DB transaction)
                                    → has_voted = true in DB
                                    → Socket.IO broadcasts updated results
                                    → Confirmation SMS sent
                                    → /vote/confirmed → /results


ADMIN JOURNEY
─────────────
/admin → Login (username + password)
  → Dashboard: turnout stats, pending candidates
  → /admin/voters: add phones (single or CSV bulk)
  → /admin/candidates: approve / reject with SMS notification
  → /admin/config: set voting window open/close times
  → /admin/results: full live results + Socket.IO feed
  → /admin/export: download results and voter list as CSV
```

---

*Equity Leaders Program — Moi Chapter | IEC Internal Document | Confidential*