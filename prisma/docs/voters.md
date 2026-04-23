# ELP Moi Chapter — Voter Experience Redesign Plan
> Full specification for the premium, mobile-first voter flow rebuild
> Stack: Next.js (App Router) · Tailwind CSS · Socket.IO · Africa's Talking SMS

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Page Architecture & Routes](#2-page-architecture--routes)
3. [Landing Page — Live Results Embedded](#3-landing-page--live-results-embedded)
4. [Step 1 — Phone Entry](#4-step-1--phone-entry)
5. [Step 2 — OTP Verification (Redesigned)](#5-step-2--otp-verification-redesigned)
6. [Step 3 — Multi-Position Ballot](#6-step-3--multi-position-ballot)
7. [Step 4 — Review & Confirm](#7-step-4--review--confirm)
8. [Step 5 — Vote Confirmed & Results](#8-step-5--vote-confirmed--results)
9. [OTP Logic Deep Dive (Anti-Wastage)](#9-otp-logic-deep-dive-anti-wastage)
10. [Multi-Position Ballot Navigation Logic](#10-multi-position-ballot-navigation-logic)
11. [Real-Time Results on Landing Page](#11-real-time-results-on-landing-page)
12. [Mobile-First Responsive Rules](#12-mobile-first-responsive-rules)
13. [State Management Map](#13-state-management-map)
14. [Component Breakdown](#14-component-breakdown)
15. [API Changes Required](#15-api-changes-required)
16. [Animation & Micro-interaction Spec](#16-animation--micro-interaction-spec)
17. [Error States & Edge Cases](#17-error-states--edge-cases)

---

## 1. Design Principles

| Principle | What it means in practice |
|---|---|
| **Progressive disclosure** | Show only what the voter needs right now. Never overwhelm. |
| **Zero dead ends** | Every error has a clear next action. No blank pages. |
| **OTP frugality** | A voter should never need to request more than one OTP per session unless they explicitly ask. |
| **Position-by-position clarity** | For elections with 5+ positions, a wizard stepper beats a one-giant-page scroll. |
| **Mobile-first** | Design for a 375px phone screen. Scale up to desktop gracefully. |
| **Trust signals** | Show progress indicators, confirmations, and success states clearly so a voter knows their vote counted. |
| **Live results as engagement** | Results visible on the landing page (before and after voting) keep voters engaged and trust the process. |

---

## 2. Page Architecture & Routes

```
/                          → Landing page (phone entry + live results preview sidebar/below)
/vote                      → Ballot (multi-position wizard, protected by JWT)
/vote/confirmed            → Vote success screen
/results                   → Full live results (public, Socket.IO)
/closed                    → Voting window closed
/not-registered            → Phone not in voter registry
```

> **No separate `/verify-otp` route needed.** OTP verification is handled inline on `/` as a step inside the auth card — no URL change. This avoids the problem of the voter navigating back and re-entering their phone number from scratch.

---

## 3. Landing Page — Live Results Embedded

### 3.1 Layout (Desktop — ≥ 768px)

```
┌────────────────────────────────────────────────────────┐
│                    HEADER / LOGO                       │
├─────────────────────────┬──────────────────────────────┤
│                         │                              │
│   AUTH CARD             │   LIVE RESULTS PANEL         │
│   (Phone → OTP → done)  │   (Socket.IO, auto-updates)  │
│                         │                              │
│   max-w: 420px          │   flex-1, scrollable         │
│                         │   One mini bar chart per     │
│                         │   position                   │
│                         │                              │
└─────────────────────────┴──────────────────────────────┘
```

### 3.2 Layout (Mobile — < 768px)

```
┌──────────────────────────┐
│        HEADER            │
├──────────────────────────┤
│                          │
│      AUTH CARD           │
│   (full width, stacked)  │
│                          │
├──────────────────────────┤
│  LIVE RESULTS (below)    │
│  Collapsible accordion   │
│  per position            │
└──────────────────────────┘
```

### 3.3 Live Results Panel Behaviour

- Fetches `/api/results` on mount for initial snapshot.
- Connects to Socket.IO namespace `/results`.
- On each `vote_cast` event → update vote counts with animated count-up transitions.
- Each position rendered as a **mini horizontal bar chart**:
  - Candidate photo (24px circle) + name + school
  - Animated progress bar showing vote percentage
  - Vote count badge (e.g., "12 votes")
- A small "🟢 Live" badge pulses in the top-right of the panel when Socket is connected.
- If voting is still open: show a subtle "Cast your vote →" CTA linking to the auth card.
- If voting is closed: show "Voting has closed. Final results below."

---

## 4. Step 1 — Phone Entry

### 4.1 UI Elements

```
┌─────────────────────────────────────┐
│  🗳  ELP Moi Chapter Elections      │
│  Cast your vote securely            │
│─────────────────────────────────────│
│  Phone Number                       │
│  ┌─────────────────────────────┐    │
│  │ +254 │ 712 345 678          │    │
│  └─────────────────────────────┘    │
│  [  Get My Secure Code  →  ]        │
│─────────────────────────────────────│
│  🔒 Your number is never shared     │
└─────────────────────────────────────┘
```

### 4.2 Phone Input Design

- **Flag + country code picker** (+254 pre-selected for Kenya). Voter only types the local number (07xx or 01xx). System normalises to E.164 before sending.
- Input is `type="tel"` with `inputmode="numeric"` for mobile numeric keyboard.
- Auto-format as the voter types: `0712 345 678` (spaced for readability). Strip spaces before API call.
- Inline validation on blur: must match Kenyan mobile pattern (`/^(07|01)\d{8}$/`).

### 4.3 Flow on Submit

```
User clicks "Get My Secure Code"
        │
        ▼
Client normalises phone → E.164
        │
        ▼
POST /api/vote/auth/request-otp
        │
   ┌────┴────┐
   │         │
200 OK     Error cases:
(OTP sent)  ├── 404 → "Not registered" message inline (not a redirect)
            ├── 409 → "Already voted" → show results inline or redirect /results
            └── 429 → Rate limited → show countdown until next allowed request
```

- On 404 (not registered): Do **not** redirect. Show a compassionate inline message:
  > *"This number isn't in the ELP voter registry. Double-check the number, or contact the IEC for help."*
  The voter stays on the same card and can correct the number.

- On 409 (already voted): Show a congratulation-style message inline:
  > *"You've already cast your vote! 🎉 Scroll down to watch the live results."*
  Smoothly scroll the page to the results panel below. No redirect.

---

## 5. Step 2 — OTP Verification (Redesigned)

### 5.1 UI — OTP Entry Card

```
┌─────────────────────────────────────┐
│  📲 Code sent to +254 712 345 678   │
│  [Change number]                    │
│─────────────────────────────────────│
│  Enter your 6-digit code            │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│  │ _ │ │ _ │ │ _ │ │ _ │ │ _ │ │ _ ││
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘│
│                                     │
│  Code expires in  02:47             │
│                                     │
│  [   Verify Code   →   ]            │
│─────────────────────────────────────│
│  Didn't receive it?                 │
│  [Resend] available in 00:45        │
└─────────────────────────────────────┘
```

### 5.2 Six-Box OTP Input (Premium UX)

- **6 individual single-digit input boxes** — each `<input maxLength={1}>`.
- Auto-advance: typing a digit in box N automatically focuses box N+1.
- Backspace in an empty box focuses the previous box.
- Paste support: if voter pastes "123456", it splits across all 6 boxes automatically.
- On mobile: `inputmode="numeric"` triggers a number-only keyboard.
- Each box has a subtle "filled" state (different border colour when a digit is present).
- Auto-submit: when the 6th digit is entered, the form submits automatically — no button tap needed.

### 5.3 Expiry Countdown Timer

- OTP expires in **5 minutes** (300 seconds) — matches `expires_at` from `otp_requests` table.
- A live countdown is shown: `Code expires in 04:32`.
- Timer ticks down every second.
- At **0:00**: inputs are disabled, countdown turns red, message changes to:
  > *"Your code has expired. Request a new one below."*
  Resend button becomes immediately active.
- Timer is stored in component state (`expires_at` returned from request-otp API response).

### 5.4 Resend Logic — Anti-Wastage Rules

This is the most critical UX improvement. See [Section 9](#9-otp-logic-deep-dive-anti-wastage) for full detail.

**Summary:**
- Resend button is **disabled by default** for 60 seconds after an OTP is sent.
- Shows a countdown: `Resend available in 00:43`.
- After 60s: button becomes active with label "Resend Code".
- After 3 failed attempts on the same OTP → code is invalidated. Resend becomes immediately available.
- After OTP expires (5 min) → resend becomes immediately available.
- Max 5 OTP requests per phone per hour (enforced server-side, shown as a friendly rate-limit message with wait time).

### 5.5 Attempt Tracking

- Server returns remaining attempts on wrong-code errors: e.g., `{ error: "Invalid code", attemptsLeft: 2 }`.
- UI shows: *"Incorrect code. 2 attempts remaining."*
- On 0 attempts left: *"Code invalidated after too many attempts. Request a new one."* — resend button activates.

### 5.6 "Change Number" Link

- Small text link at the top of the OTP card: "Change number".
- Clicking it resets the entire auth card back to Step 1 (phone entry).
- The OTP that was sent is not invalidated — it just won't be used. The server-side rate limit prevents abuse.

---

## 6. Step 3 — Multi-Position Ballot

### 6.1 The Core Problem with a Single-Page Ballot

When there are 3+ positions each with 4+ candidates, a single scrolling page becomes overwhelming on mobile. A voter may not realise they've missed a position. The "Complete All Selections" button at the bottom is easy to miss.

### 6.2 Wizard Stepper Approach

The ballot is split into **one position per screen** with a top progress stepper.

```
┌──────────────────────────────────────────┐
│  ● ─────── ○ ─────── ○ ─────── ○        │
│  Chair     Sec       Treas     …         │
│                                          │
│  CHAIRPERSON                             │
│  Select one candidate                    │
│──────────────────────────────────────────│
│  ┌──────────────────┐ ┌──────────────┐   │
│  │ [Photo]          │ │ [Photo]      │   │
│  │ Alice Wanjiru    │ │ Brian Otieno │   │
│  │ MU Main Campus   │ │ Eldoret CBD  │   │
│  │ 3rd Year         │ │ 2nd Year     │   │
│  └──────────────────┘ └──────────────┘   │
│                                          │
│           [ Next: Secretary → ]          │
└──────────────────────────────────────────┘
```

### 6.3 Stepper Behaviour

- **Step indicator** at top: filled circle = completed, pulsing circle = current, empty circle = upcoming.
- Clicking a completed step (● ) jumps back to review/change that selection.
- The "Next" button is disabled until a candidate for the current position is selected.
- Last position: "Next" becomes "Review My Ballot →".
- **Back button** always available to go to previous position without losing selections.
- No selections are ever lost when navigating between steps.

### 6.4 Candidate Card Design (Mobile-Optimised)

```
┌──────────────────────────────────────┐
│  ○  [Photo 56px]  Alice Wanjiru      │  ← Radio circle on left
│                   MU Main Campus     │
│                   3rd Year           │
└──────────────────────────────────────┘
```

- On mobile (< 640px): **full-width stacked cards** — one per row — with large tap area (min 72px height). The radio indicator is on the left, candidate info on the right.
- On tablet/desktop (≥ 640px): **2-column grid** of cards.
- Selected state: card border glows with brand blue, radio turns to filled checkmark, card background subtly highlights.
- Each card has a large invisible tap overlay (`pointer-events: all, inset-0`) to maximise tap target on mobile.

### 6.5 Handling Positions with Many Candidates

- If a position has > 4 candidates: show 4, then a "Show all X candidates" expansion toggle.
- Expansion animates smoothly (CSS max-height transition).
- All candidates are tappable at full size — no horizontal scroll or tiny cards.

---

## 7. Step 4 — Review & Confirm

### 7.1 Review Screen (Not a Modal on Mobile)

On mobile, a full-page confirmation is better than a modal that clips content.

- Shows a clean list: each position on the left, selected candidate name + small photo on the right.
- A warning banner at top: *"⚠ This cannot be changed. Review carefully."*
- A checkbox: *"I confirm these are my final choices"* — must be ticked before the "Cast Vote" button activates. This adds one deliberate friction point to prevent accidental submissions.
- "Cast Vote" button is large (48px height minimum), full-width on mobile, right-aligned on desktop. Has a 1-second loading spinner after tap (prevents double-tap double-submit).

### 7.2 The "Cast Vote" Button Behaviour

```
Voter taps "Cast Vote"
      │
      ▼
Button enters loading state (spinner, disabled)
      │
      ▼
POST /api/vote/submit
      │
  ┌───┴───┐
  │       │
200 OK   Error
      │       │
      ▼       ▼
Vote confirmed  Show error inline
page            (button re-enables)
```

- Button is disabled immediately on tap — prevents double-submit.
- If the API call fails (network error), the button re-enables with an error message. The voter can retry.
- If the API returns 409 (already voted — race condition): redirect to results with a friendly message.

---

## 8. Step 5 — Vote Confirmed & Results

### 8.1 Confirmation Screen (`/vote/confirmed`)

```
┌───────────────────────────────────┐
│                                   │
│         ✅  (animated)            │
│                                   │
│   Your vote has been cast!        │
│   Thank you for participating     │
│   in the ELP Moi Chapter          │
│   Elections.                      │
│                                   │
│   [ Watch Live Results → ]        │
│                                   │
└───────────────────────────────────┘
```

- The ✅ checkmark animates in (scale + fade).
- After 2.5 seconds, a "Watch Live Results →" button appears.
- Auto-redirects to `/results` after 5 seconds (with a visible countdown: "Redirecting in 3…").
- Voter cannot go back to `/vote` — the JWT + `has_voted` flag prevent it.

### 8.2 Full Results Page (`/results`)

Accessible by anyone (public). Shows:
- Real-time vote counts per position, updated via Socket.IO.
- Each position section has a live leaderboard with animated bar charts.
- At the top: total voter turnout counter (% voted out of registered).
- A "🟢 Live" pulse indicator.
- If the window is closed: show a "Final Results" banner.

---

## 9. OTP Logic Deep Dive (Anti-Wastage)

### 9.1 The Problem

The current flow sends a new OTP every time the voter touches "Resend". On a slow phone network, a voter might tap Resend 3–4 times while the first SMS is still in transit, burning 4 SMSes and confusing themselves with multiple codes.

### 9.2 Server-Side: `request-otp` Changes

**Idempotency window:** Before sending a new OTP, check if there is already an un-expired, un-verified OTP for this phone in `otp_requests` that is **less than 60 seconds old**.

```typescript
// Pseudocode for POST /api/vote/auth/request-otp
const recentOtp = await db.otpRequest.findFirst({
  where: {
    phone,
    verified: false,
    sentAt: { gte: new Date(Date.now() - 60_000) }, // within last 60s
    expiresAt: { gte: new Date() },                 // not expired
  },
});

if (recentOtp) {
  // Don't send a new SMS. Return the remaining TTL so the client
  // can show "your code is still valid for X seconds".
  return res.status(200).json({
    ok: true,
    alreadySent: true,
    expiresAt: recentOtp.expiresAt,
    // Do NOT re-expose the OTP code — just the expiry
  });
}
// ... else generate new OTP and send SMS
```

**What the client does with `alreadySent: true`:**
- Does NOT treat this as a new OTP request.
- Updates the expiry timer to the returned `expiresAt`.
- Shows: *"Your code is still on its way. It was sent X seconds ago."*

### 9.3 Client-Side: Cooldown Timer After Initial Send

When the voter first submits their phone number and the OTP is sent:
- Record `otpSentAt = Date.now()` in component state.
- Resend button is locked for **60 seconds** from `otpSentAt`.
- Visual countdown: `Resend available in 00:55`.

```typescript
// In component state
const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
const [resendCooldown, setResendCooldown] = useState(0); // seconds remaining

useEffect(() => {
  if (!otpSentAt) return;
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - otpSentAt) / 1000);
    const remaining = Math.max(0, 60 - elapsed);
    setResendCooldown(remaining);
    if (remaining === 0) clearInterval(interval);
  }, 1000);
  return () => clearInterval(interval);
}, [otpSentAt]);
```

### 9.4 Resend Button States

| State | Button Label | Clickable? |
|---|---|---|
| Initial OTP just sent | `Resend available in 00:59` | No |
| Cooldown counting | `Resend available in 00:34` | No |
| Cooldown elapsed, OTP still valid | `Resend Code` | Yes |
| OTP expired | `Request New Code` | Yes |
| Max attempts exceeded | `Request New Code` | Yes |
| Rate limit hit (5/hr) | `Try again in X minutes` | No |

### 9.5 Resend Flow (When Permitted)

```
Voter clicks "Resend Code"
       │
       ▼
POST /api/vote/auth/request-otp
       │
   Server checks:
   - alreadySent within 60s? → return alreadySent: true
   - rate limit (5/hr)?      → return 429 with retryAfter
   - else: invalidate old OTPs, generate new, send SMS
       │
       ▼
Client resets:
   - All 6 OTP boxes cleared
   - otpSentAt = Date.now()
   - Expiry timer restarted
   - Cooldown restarted (60s)
   - Show toast: "New code sent to +254…"
```

### 9.6 API Response Changes for `request-otp`

Add these fields to the success response:

```typescript
{
  ok: true,
  alreadySent?: boolean,   // true if re-using existing OTP window
  expiresAt: string,       // ISO timestamp — client uses this for expiry timer
  cooldownSeconds: number  // client uses this for resend cooldown (always 60)
}
```

---

## 10. Multi-Position Ballot Navigation Logic

### 10.1 State Shape

```typescript
interface BallotState {
  positions: PositionData[];        // All positions with candidates
  currentStep: number;              // 0-indexed
  selections: Record<string, number>; // positionTitle → candidateId
  isReviewing: boolean;             // true when on the review/confirm screen
}
```

### 10.2 Navigation Rules

```
Go to next step:
  - If currentStep < positions.length - 1:
      currentStep++
  - Else (last position):
      isReviewing = true

Go back:
  - If isReviewing:
      isReviewing = false
  - Else if currentStep > 0:
      currentStep--
  - Else (step 0):
      // Cannot go back — ballot is one-way after auth

Jump to step N (from stepper):
  - Only allowed if selections[positions[N].title] is already set (completed step)
  - OR if N < currentStep (going back)
```

### 10.3 Persisting Selections Through Navigation

Selections are stored in the top-level `BallotState`. Navigating between steps never clears selections. The voter can change a previous selection by going back to that step — the previously selected candidate card simply shows as selected on return.

### 10.4 Completing the Ballot

The "Review My Ballot" button at the last position only becomes active when `selections` has an entry for every position title. This is a final client-side check — server-side validation runs again on submit.

### 10.5 Stepper Component Visual Spec

```
Step N: completed  →  filled blue circle (●) with white checkmark
Step N: current    →  blue ring with pulsing animation (◉)
Step N: upcoming   →  grey empty circle (○)

Connector line between steps:
  - Completed → next: blue line
  - Current → upcoming: grey dashed line
```

On mobile: abbreviate position titles to fit (max 8 characters + "…"). Full title on tooltip/long press.

---

## 11. Real-Time Results on Landing Page

### 11.1 Connection Strategy

- Socket.IO connection is initiated **lazily** — only after the page is fully loaded and the voter is not mid-auth.
- If the voter is actively entering their phone or OTP, the socket connection is established silently in the background but results panel updates are **throttled** (max 1 update per 3 seconds) to avoid distracting the voter.
- On mobile, the results panel is collapsed by default (accordion). It expands with an animation when tapped.

### 11.2 Results Panel Component

```tsx
// Minimal interface
interface ResultsPanelProps {
  initialData: ResultsPayload | null;
  compact?: boolean;   // true on landing page, false on /results
}
```

**`compact=true` (landing page):**
- Each position shows top-2 candidates only with abbreviated bar chart.
- "See full results →" link at the bottom.
- Max height on mobile: 320px with `overflow-y: auto`.

**`compact=false` (/results page):**
- Full leaderboard per position.
- Larger bar charts with vote counts and percentages.
- Total turnout counter at the top.

### 11.3 Animation Spec for Vote Count Updates

When a `vote_cast` Socket.IO event arrives:

1. The updated candidate's bar width animates from old width to new width over 600ms (CSS `transition: width 0.6s ease`).
2. The vote count number does a **count-up animation** over 400ms.
3. A subtle green flash highlight on the updated candidate row (150ms fade).
4. If the leader changes position: cards reorder with a smooth animation (CSS `order` transition or FLIP animation).

---

## 12. Mobile-First Responsive Rules

### 12.1 Breakpoints

| Name | Min width | Usage |
|---|---|---|
| `xs` | 375px | Base — single column, everything stacked |
| `sm` | 640px | Candidate grid becomes 2 columns |
| `md` | 768px | Auth card + results panel side-by-side |
| `lg` | 1024px | Results panel gets wider |

### 12.2 Touch Targets

- All interactive elements: minimum **48px × 48px** tap area (WCAG 2.5.5 AAA).
- Candidate cards: minimum **72px** height.
- OTP input boxes: minimum **48px × 56px** per box.
- Buttons: minimum **48px** height on all screens.

### 12.3 Mobile-Specific Behaviours

| Behaviour | Desktop | Mobile |
|---|---|---|
| OTP input | 6 boxes in a row | 6 boxes in a row (smaller, ~40px each) |
| Candidate cards | 2-column grid | Full-width stacked list |
| Confirmation modal | Modal overlay | Full-screen slide-up |
| Results panel | Right sidebar | Accordion below auth card |
| Stepper labels | Full position title | Truncated (8 chars max) |
| "Cast Vote" button | Right-aligned | Full width, sticky bottom |

### 12.4 Sticky Bottom Bar on Mobile

On the ballot step pages, the action button (Next / Review) is **sticky at the bottom of the viewport**:

```css
.ballot-action-bar {
  position: sticky;
  bottom: 0;
  background: rgba(surface-900, 0.92);
  backdrop-filter: blur(12px);
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom)); /* iPhone notch */
  border-top: 1px solid rgba(255,255,255,0.07);
}
```

---

## 13. State Management Map

```
app/(public)/page.tsx   ← Root landing page component
│
├── AuthCard (local state)
│   ├── step: 'PHONE' | 'OTP'
│   ├── phone: string
│   ├── otp: string[6]         ← array for 6-box input
│   ├── otpSentAt: number
│   ├── otpExpiresAt: Date
│   ├── attemptsLeft: number
│   ├── resendCooldown: number
│   ├── loading: boolean
│   └── error: string | null
│
└── ResultsPanel (local state)
    ├── data: ResultsPayload | null
    ├── isConnected: boolean
    ├── isExpanded: boolean      ← mobile accordion
    └── lastUpdated: Date | null

app/(voter)/vote/page.tsx   ← Ballot page
│
└── BallotWizard (local state)
    ├── positions: PositionData[]
    ├── currentStep: number
    ├── selections: Record<string, number>
    ├── isReviewing: boolean
    ├── isConfirmed: boolean
    └── submitting: boolean
```

> No global state manager (Zustand/Redux) is needed — local component state with prop drilling is sufficient for the voter flow. The auth JWT is managed server-side in `httpOnly` cookies.

---

## 14. Component Breakdown

### New/Modified Components

| Component | Path | Description |
|---|---|---|
| `PhoneInput` | `components/voter/PhoneInput.tsx` | Country code + local number input, auto-normalises to E.164 |
| `OtpInput` | `components/voter/OtpInput.tsx` | 6-box OTP entry with auto-advance, paste support, auto-submit |
| `OtpCountdown` | `components/voter/OtpCountdown.tsx` | Expiry timer + resend cooldown display |
| `BallotWizard` | `components/voter/BallotWizard.tsx` | Replaces `BallotForm.tsx` — step-by-step position navigator |
| `BallotStepper` | `components/voter/BallotStepper.tsx` | Top step indicator with completed/current/upcoming states |
| `CandidateCard` | `components/voter/CandidateCard.tsx` | Individual candidate card with selected state |
| `ReviewScreen` | `components/voter/ReviewScreen.tsx` | Full-page review before final submission |
| `ResultsPanel` | `components/voter/ResultsPanel.tsx` | Live results (compact + full modes) |
| `ResultsBar` | `components/voter/ResultsBar.tsx` | Animated progress bar for a single candidate |
| `TurnoutCounter` | `components/voter/TurnoutCounter.tsx` | Animated voter turnout percentage |
| `DeviceWarningModal` | `components/voter/DeviceWarningModal.tsx` | Replaces the native `window.confirm` with a styled modal |
| `AuthCard` | `components/voter/AuthCard.tsx` | Wraps the full phone → OTP flow in one card |

---

## 15. API Changes Required

### 15.1 `POST /api/vote/auth/request-otp`

**Add to response:**
```typescript
{
  ok: true,
  alreadySent: boolean,   // NEW — was an existing valid OTP reused?
  expiresAt: string,      // NEW — ISO timestamp of OTP expiry
  cooldownSeconds: 60,    // NEW — always 60, tells client how long to lock resend
}
```

**Add idempotency logic:** (see Section 9.2)

### 15.2 `POST /api/vote/auth/verify-otp`

**Add to error response:**
```typescript
{
  error: "Invalid code",
  attemptsLeft: number,   // NEW — remaining attempts before code invalidation
  invalidated: boolean,   // NEW — true if code has now been invalidated (0 attempts)
}
```

### 15.3 `GET /api/results`

**Ensure the response includes:**
```typescript
{
  positions: [
    {
      id: number,
      title: string,
      displayOrder: number,
      candidates: [
        {
          id: number,
          name: string,
          photoUrl: string,
          school: string,
          yearOfStudy: string,
          votes: number,
          percentage: number,  // NEW — pre-calculated on server
        }
      ],
      totalVotes: number,      // NEW — sum of all votes for this position
    }
  ],
  turnout: {                   // NEW
    voted: number,
    total: number,
    percentage: number,
  },
  isOpen: boolean,             // NEW — whether voting window is currently open
  closesAt: string | null,     // NEW — ISO timestamp
}
```

### 15.4 Socket.IO `vote_cast` Event

Ensure the payload matches the full `GET /api/results` response shape so the client can do a full replace without re-fetching.

---

## 16. Animation & Micro-interaction Spec

| Interaction | Animation |
|---|---|
| Card entrance | `opacity: 0→1, translateY: 16px→0`, 300ms ease-out |
| Step transition (next) | Current card slides left + fades out, new card slides in from right, 250ms |
| Step transition (back) | Reverse — new card from left, 250ms |
| OTP box fill | Border colour transition `grey→blue`, 150ms |
| Candidate card select | Border `transparent→blue`, background `surface-800→brand-500/10`, scale `1→1.01`, 200ms |
| Vote count update | Count-up over 400ms, green flash on row, 150ms |
| Progress bar update | Width transition 600ms cubic-bezier(0.4, 0, 0.2, 1) |
| Success checkmark | Scale `0→1.2→1`, 400ms spring |
| Error shake | `translateX: 0→-6px→6px→0`, 300ms |
| Resend button activate | Greyed out → blue, 200ms |

All animations respect `prefers-reduced-motion: reduce` — if set, all transitions are instant (0ms).

---

## 17. Error States & Edge Cases

| Scenario | Current Behaviour | Improved Behaviour |
|---|---|---|
| Phone not registered | Redirect to `/not-registered` | Inline error in auth card, voter stays and can correct number |
| Already voted | Redirect to `/results` | Inline congrats message, smooth scroll to results panel below |
| OTP expired | Generic error | Countdown reaches 0, clear message, resend button activates |
| Wrong OTP | Generic error | "X attempts remaining" message, auto-clear boxes |
| Max OTP attempts | Generic error | Code invalidated, resend activates, clear message |
| Rate limited (5 OTPs/hr) | Generic error | "Try again in X minutes" with exact countdown |
| Network failure on vote submit | Button stays loading | Button re-enables, error shown inline, voter can retry |
| Vote submit race condition (409) | Alert + redirect | Friendly modal: "Your vote was already recorded!" + results link |
| Ballot with 0 approved candidates | — | Empty state with message: "No approved candidates yet for this position." (position still shown in stepper) |
| Device fingerprint mismatch | `window.confirm()` dialog | Styled modal with clearer explanation and contact IEC option |
| Voting window closed mid-session | No guard | On `/vote` load, if `isOpen = false`, show "Voting has closed" with results link |
| JWT expired mid-ballot | 401 on submit | Detect 401, show "Your session has expired. Please log in again." with link to `/` |
| OTP SMS not received (common on Airtel) | No guidance | Add note: "SMS can take up to 2 minutes on some networks. Check spam/junk SMS." |

---

## Summary: What Gets Built

1. **Landing page split layout** — auth card left, live results right (desktop) or stacked (mobile).
2. **PhoneInput component** — country code prefix, auto-normalise, validation.
3. **6-box OtpInput** — auto-advance, paste, auto-submit, mobile-optimised.
4. **OTP cooldown system** — 60s lock, expiry timer, intelligent resend that reuses valid OTPs.
5. **BallotWizard** — one position per screen, stepper progress indicator, back/forward navigation.
6. **CandidateCard** — large tap targets, selected glow, photo + info.
7. **ReviewScreen** — full-page review, confirmation checkbox, cast vote button.
8. **ResultsPanel** — compact (landing) and full (/results) modes, Socket.IO live updates, animated bars.
9. **API additions** — `expiresAt`, `alreadySent`, `attemptsLeft`, richer results payload.
10. **Full mobile responsiveness** — 48px touch targets, sticky action bar, safe-area insets, numeric keyboards.

---

*Last updated: April 2026 — ELP Moi Chapter IEC*