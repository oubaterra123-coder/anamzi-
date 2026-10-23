"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim() },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session && data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          display_name: name.trim(),
        });

      if (profileError) {
        setMessage("Account created, but profile setup failed. Please sign in.");
        return;
      }

      router.replace("/");
      return;
    }

    setMessage("Account created. Check your email to confirm it, then sign in.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050706] px-5 py-12 text-[#e5e7eb]">
      <form onSubmit={handleSignup} className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-[#0b0f0c] p-8">
        <Link href="/" className="text-sm text-[#b7ff35]">← ANAMZI</Link>
        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="text-sm text-gray-400">Join ANAMZI and discover products.</p>

        <input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]" />
        <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]" />
        <input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (at least 8 characters)" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#b7ff35]" />

        {message && <p role="status" className="text-sm text-[#b7ff35]">{message}</p>}

        <button disabled={loading} className="w-full rounded-xl bg-[#b7ff35] px-4 py-3 font-bold text-black disabled:opacity-50">
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-gray-400">
          Already registered? <Link href="/login" className="text-[#b7ff35]">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
