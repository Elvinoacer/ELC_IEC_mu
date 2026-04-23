import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PublicShell from "@/components/layouts/PublicShell";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/jwt";

export const metadata = { title: "Admin Login — ELP Moi Chapter" };

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (token && (await verifyAdminToken(token))) {
    redirect("/admin/dashboard");
  }

  return (
    <PublicShell>
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 font-[family-name:var(--font-outfit)]">
            IEC Admin
          </h1>
          <p className="text-slate-400 text-sm">
            Sign in to manage the election.
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <AdminLoginForm />
        </div>
      </div>
    </PublicShell>
  );
}
