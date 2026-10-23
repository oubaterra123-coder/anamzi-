"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) router.replace("/");
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.session) {
        setMessage("Invalid email or password.");
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await response.json();

      if (!response.ok) {
        await supabase.auth.signOut();
        setMessage(result.error || "Unable to sign in.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050706] px-5 py-12 text-[#e5e7eb]">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-[#0b0f0c] p-8">
        <Link href="/" className="text-sm text-[#b7ff35]">â† ANAMZI</Link>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-sm text-gray-400">Sign in to continue to ANAMZI.</p>

        <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]" />
        <input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]" />

        {message && <p role="alert" className="text-sm text-red-400">{message}</p>}

        <button disabled={loading} className="w-full rounded-xl bg-[#b7ff35] px-4 py-3 font-bold text-black disabled:opacity-50">
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-sm text-gray-400">
          New to ANAMZI? <Link href="/signup" className="text-[#b7ff35]">Create an account</Link>
        </p>
      </form>
    </main>
  );
}

