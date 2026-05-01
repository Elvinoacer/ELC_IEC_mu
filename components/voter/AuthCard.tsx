"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SmartPhoneInput from "@/components/ui/PhoneInput";
import OtpInput from "@/components/voter/OtpInput";
import { generateDeviceFingerprint } from "@/lib/fingerprint";
import { normalizePhone } from "@/lib/phone";

import { useToast } from "@/context/ToastContext";

type Step = "PHONE" | "OTP";

export default function AuthCard({
  onAlreadyVoted,
}: {
  onAlreadyVoted?: () => void;
}) {
  const router = useRouter();
  const { success: showSuccess, info: showInfo, error: showError } = useToast();
  const [step, setStep] = useState<Step>("PHONE");
  const [localPhone, setLocalPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const [alreadyVotedMessage, setAlreadyVotedMessage] = useState("");
  const [deviceCheckLoading, setDeviceCheckLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  const otpCode = useMemo(() => otp.join(""), [otp]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const fp = await generateDeviceFingerprint();
        if (cancelled) return;
        setFingerprint(fp);

        const res = await fetch("/api/vote/auth/device-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceHash: fp }),
        });

        const json = await res.json();
        if (!cancelled && res.ok && json.data?.hasVotedOnThisDevice) {
          showInfo("You have already voted on this device.");
          router.push("/results?voted=true");
        }
      } catch {
        // do not block auth flow on device pre-check failures
      } finally {
        if (!cancelled) setDeviceCheckLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (cooldownUntil <= 0) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000),
      );
      setCooldownSeconds(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const sendOtp = async () => {
    const parsed = normalizePhone(localPhone);
    if (!parsed) {
      setError("Use a valid Kenyan mobile number (07xx or 01xx).");
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);
    setAlreadyVotedMessage("");

    const res = await fetch("/api/vote/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: parsed }),
    });

    const json = await res.json();
    if (!res.ok) {
      const message = json.error || "Could not send OTP.";

      if (res.status === 409) {
        if (message.toLowerCase().includes("already cast your vote")) {
          setAlreadyVotedMessage(
            "You've already cast your vote! Scroll down to watch live results.",
          );
          showInfo("You have already voted.");
          onAlreadyVoted?.();
          setLoading(false);
          return;
        }

        setError(message);
        setLoading(false);
        return;
      }

      if (res.status === 404) {
        setError(message);
        setLoading(false);
        return;
      }

      setError(message);
      setLoading(false);
      return;
    }

    const data = json.data;
    setStep("OTP");
    setNormalizedPhone(parsed);
    setMaskedEmail(data.maskedEmail || null);
    setExpiresAt(data.expiresAt);
    const seconds = data.cooldownSeconds ?? 60;
    setCooldownUntil(Date.now() + seconds * 1000);
    setCooldownSeconds(seconds);
    setOtp(Array(6).fill(""));
    if (data.alreadySent) {
      setError(
        "A valid OTP is already active for this voter account. Please use the code already sent to your email.",
      );
    } else {
      showSuccess(`OTP sent to ${data.maskedEmail || "your verified email"}`);
    }
    setLoading(false);
  };

  const verifyOtp = async (code: string) => {
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);
    setWarning(null);

    const res = await fetch("/api/vote/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalizedPhone,
        code,
        deviceHash: fingerprint,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setAttemptsLeft(json.attemptsLeft ?? null);
      setError(json.error || "Code verification failed.");
      setOtp(Array(6).fill(""));
      setLoading(false);
      return;
    }

    showSuccess("Device verified ✓");

    if (json.data?.deviceWarning) {
      setWarning("Recognized new device. Updating security records...");
      setTimeout(() => router.push("/vote"), 2000);
    } else {
      router.push("/vote");
    }
  };

  return (
    <Card
      padding="xl"
      className="relative overflow-hidden border-white/20 bg-linear-to-b from-surface-800/90 via-surface-900/85 to-surface-900/70 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.6)] p-4 sm:p-8"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-300/80">
        Secure Voter Access
      </p>
      <h1 className="mb-2 text-xl sm:text-2xl md:text-3xl font-bold text-white">
        ELP Moi Chapter Elections
      </h1>
      <p className="mb-4 sm:mb-6 text-xs sm:text-sm text-slate-300">
        A trusted and elegant voting experience.
      </p>

      {deviceCheckLoading && (
        <p className="mb-4 text-xs text-slate-400">
          Preparing secure device session...
        </p>
      )}

      {alreadyVotedMessage && (
        <p className="mb-4 rounded-lg border border-brand-500/20 bg-brand-500/10 p-3 text-sm text-brand-200">
          {alreadyVotedMessage}
        </p>
      )}
      {warning && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300 animate-pulse">
          {warning}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-300">
          {error}
        </p>
      )}

      {step === "PHONE" ? (
        <div className="space-y-4">
          <SmartPhoneInput
            value={localPhone}
            onChange={setLocalPhone}
            disabled={loading}
            autoFocus
          />
          <Button
            className="w-full min-h-10 sm:min-h-12"
            onClick={sendOtp}
            loading={loading}
            disabled={deviceCheckLoading}
          >
            Get My Secure Code
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-300">
              Code sent to your verified email{" "}
              <span className="font-semibold text-white">
                {maskedEmail || "on file"}
              </span>
            </p>
            <button
              className="mt-1 text-xs text-brand-400 hover:text-brand-300"
              onClick={() => setStep("PHONE")}
              type="button"
            >
              Change number
            </button>
          </div>
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={verifyOtp}
            disabled={loading}
          />
          {expiresAt && (
            <p className="text-xs text-slate-400">
              Code expires at{" "}
              {new Date(expiresAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {attemptsLeft !== null ? ` · ${attemptsLeft} attempts left` : ""}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button
              className="flex-1 min-h-10 sm:min-h-12"
              loading={loading}
              onClick={() => verifyOtp(otpCode)}
              disabled={otpCode.length !== 6}
            >
              Verify Code
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={sendOtp}
              disabled={loading || cooldownSeconds > 0}
              className="min-h-10 sm:min-h-12"
            >
              {cooldownSeconds > 0 ? `Resend ${cooldownSeconds}s` : "Resend"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
