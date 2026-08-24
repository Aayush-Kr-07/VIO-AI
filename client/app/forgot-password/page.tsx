"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axios";
import axios from "axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    try { const { data } = await axiosInstance.post("/api/auth/forgot-password", { email }); setMessage(data.sent ? "Check your email. Password reset instructions have been sent." : data.message); }
    catch (err: unknown) { setError(axios.isAxiosError(err) ? err.response?.data?.message || "The reset email could not be sent." : "The reset email could not be sent."); }
    finally { setLoading(false); }
  };
  return <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-12"><div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8"><h1 className="text-2xl font-bold text-slate-950">Forgot your password?</h1><p className="mt-2 text-sm text-slate-600">Enter your account email and we will send password reset instructions. The reset link will expire after one hour.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-800" htmlFor="email">Account email</label><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /><Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending instructions..." : "Email me reset instructions"}</Button>{message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}</form><Link className="mt-6 block text-center text-sm font-semibold text-blue-700" href="/login">Return to sign in</Link></div></main>;
}
