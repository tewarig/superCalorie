"use client";

import { createApiClient } from "@supercalorie/core";
import { Button } from "@supercalorie/ui/button";
import { Input } from "@supercalorie/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const api = createApiClient();

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function submit() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (isSignup) {
        await api.signup({ email, password, name });
      } else {
        await api.login({ email, password });
      }
      router.push("/today");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-4xl font-semibold text-ink">
        {isSignup ? "Start tracking" : "Welcome back"}
      </h1>
      <p className="mt-2 text-ink-soft">
        {isSignup
          ? "One account for web, iOS, and Android."
          : "Pick up where you left off."}
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {isSignup && (
          <Input label="Name" value={name} onChangeText={setName} placeholder="Gaurav" />
        )}
        <Input
          label="Email"
          type="email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChangeText={setPassword}
          placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          onSubmit={submit}
        />

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-2">
          <Button fullWidth size="lg" onPress={submit} disabled={pending}>
            {pending ? "One moment…" : isSignup ? "Create account" : "Log in"}
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          className="font-semibold text-leaf underline underline-offset-4"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "Log in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
