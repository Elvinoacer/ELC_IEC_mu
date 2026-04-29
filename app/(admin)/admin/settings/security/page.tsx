"use client";

import { useState } from "react";
import AdminShell from "@/components/layouts/AdminShell";
import Card from "@/components/ui/Card";
import { 
  ShieldCheckIcon, 
  KeyIcon, 
  ExclamationCircleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function AdminSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update password");
      } else {
        setSuccess("Your password has been updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell title="Security Settings">
      <div className="max-w-2xl mx-auto py-4 sm:py-8 fade-in">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-outfit)]">
            <ShieldCheckIcon className="w-6 h-6 text-brand-400" />
            Security & Authentication
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            Keep your administrative account secure by updating your password regularly.
          </p>
        </div>

        <Card padding="lg" className="bg-surface-800 border-white/5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-error-500/10 border border-error-500/20 rounded-xl flex gap-3 text-error-400 text-sm">
                <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-success-500/10 border border-success-500/20 rounded-xl flex gap-3 text-success-400 text-sm">
                <CheckCircleIcon className="w-5 h-5 shrink-0" />
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-900 border border-white/5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-900 border border-white/5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-900 border border-white/5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>
        </Card>

        <div className="mt-8 p-4 bg-brand-500/5 border border-brand-500/10 rounded-xl flex gap-3">
          <ExclamationCircleIcon className="w-6 h-6 text-brand-400 shrink-0" />
          <div className="text-xs text-slate-400">
            <p className="font-bold text-brand-400 uppercase tracking-wider mb-1">Security Recommendation</p>
            <p>Ensure your password is unique and contains a combination of uppercase letters, numbers, and special characters.</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
