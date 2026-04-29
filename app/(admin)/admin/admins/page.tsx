"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/layouts/AdminShell";
import Card from "@/components/ui/Card";
import { 
  UsersIcon, 
  ArrowPathIcon, 
  UserCircleIcon,
  ShieldCheckIcon,
  FingerPrintIcon,
  PlusIcon
} from "@heroicons/react/24/outline";

interface Admin {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (res.ok) {
        setAdmins(data.admins);
      } else {
        setError(data.error || "Failed to load admins");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (admin: Admin) => {
    if (!confirm(`Are you sure you want to reset the password for ${admin.username}? It will be set to the default 'Admin@2026'.`)) {
      return;
    }

    setResettingId(admin.id);
    setSuccessMsg(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/admins/${admin.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Failed to communicate with server");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <AdminShell title="Admin Management">
      <div className="max-w-5xl mx-auto py-4 sm:py-8 fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-outfit)]">
              <ShieldCheckIcon className="w-6 h-6 text-brand-400" />
              Administrative Accounts
            </h2>
            <p className="text-slate-400 mt-1 text-sm">
              View and manage system administrators.
            </p>
          </div>
          <div className="bg-brand-600/10 px-4 py-2 rounded-xl text-brand-400 text-xs font-bold border border-brand-500/20 uppercase tracking-widest">
            Total Records: {admins.length}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-500/10 border border-error-500/20 rounded-xl text-error-400 text-sm flex gap-3">
            <FingerPrintIcon className="w-5 h-5" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-success-500/10 border border-success-500/20 rounded-xl text-success-400 text-sm flex gap-3 font-medium">
            <ShieldCheckIcon className="w-5 h-5" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {admins.map((admin) => (
            <Card key={admin.id} padding="lg" className="bg-surface-800 border-white/5 shadow-xl hover:bg-surface-700 transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-900 border border-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-brand-400 transition-colors">
                    <UserCircleIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white font-[family-name:var(--font-outfit)]">{admin.username}</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                      Added {new Date(admin.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
                  admin.role === 'SUPER_ADMIN' 
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                  : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                }`}>
                  {admin.role.replace('_', ' ')}
                </span>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-end">
                {admin.role !== 'SUPER_ADMIN' && (
                  <button
                    onClick={() => handleResetPassword(admin)}
                    disabled={resettingId === admin.id}
                    className="flex items-center gap-2 text-xs font-bold text-brand-400 hover:text-brand-300 disabled:opacity-50 uppercase tracking-widest transition-colors"
                  >
                    {resettingId === admin.id ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowPathIcon className="w-4 h-4" />
                    )}
                    Reset Password
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-6 bg-brand-500/5 rounded-2xl border border-brand-500/10">
          <h4 className="font-bold text-brand-400 text-sm uppercase tracking-widest mb-3">Security & Access Protocols</h4>
          <ul className="text-xs text-slate-400 space-y-3 list-none">
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span><strong className="text-slate-300">Super Admins</strong> have unrestricted access to all election controls and administrative management.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span><strong className="text-slate-300">IEC Admins</strong> are limited to voter and candidate operations.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">•</span>
              <span>Resetting a password sets it to a <strong className="text-slate-300">temporary default</strong>. The user should be notified to update it immediately.</span>
            </li>
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
