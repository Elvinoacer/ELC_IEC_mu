"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type LoginApiResponse =
  | {
      ok: true;
      data: {
        message: string;
        user: {
          id: number;
          username: string;
          role: string;
        };
      };
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

export default function AdminLoginForm() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as LoginApiResponse | null;

      if (!response.ok || !payload || payload.ok === false) {
        const message =
          payload && payload.ok === false ? payload.error : "Unable to sign in";
        setError(message);
        return;
      }

      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        label="Username"
        id="username"
        name="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="admin"
        autoComplete="username"
        required
        disabled={isSubmitting}
      />

      <Input
        label="Password"
        id="password"
        name="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        required
        disabled={isSubmitting}
      />

      {error ? (
        <p className="text-sm text-error-500 bg-error-500/10 border border-error-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {isSubmitting ? "Signing In..." : "Sign In"}
      </Button>
    </form>
  );
}
