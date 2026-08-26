"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axios";
import axios from "axios";

function ResetPasswordForm() {
  const params = useSearchParams(); const router = useRouter();
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); setMessage(""); if (!email || !token) { setError("This reset link is missing or invalid. Request a new one."); return; } if (password !== confirmPassword) { setError("Passwords do not match"); return; } setLoading(true); try { const { data } = await axiosInstance.post("/api/auth/reset-password", { email, token, password, confirmPassword }); setMessage(data.message || "Password updated successfully. You can now sign in with your new password."); setPassword(""); setConfirmPassword(""); setTimeout(() => router.push("/login"), 2500); } catch (err: unknown) { setError(axios.isAxiosError(err) ? err.response?.data?.message || "This reset link is invalid or expired." : "This reset link is invalid or expired."); } finally { setLoading(false); } };
  const linkIsInvalid = !token;
  return <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-12"><div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8"><h1 className="text-2xl font-bold text-slate-950">Choose a new password</h1><p className="mt-2 text-sm text-slate-600">Use 10+ characters with uppercase, lowercase, a number, and a symbol.</p>{message ? <div role="status" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : linkIsInvalid ? <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">This reset link is missing or invalid. Request a new one.</div> : <form onSubmit={submit} className="mt-6 space-y-4"><div><label className="block text-sm font-medium text-slate-800" htmlFor="password">New password</label><Input id="password" type="password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} /></div><div><label className="block text-sm font-medium text-slate-800" htmlFor="confirm-password">Re-type new password</label><Input id="confirm-password" type="password" minLength={10} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating password..." : "Confirm password change"}</Button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</form>}</div></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="mx-auto max-w-md px-4 py-12">Loading...</main>}><ResetPasswordForm /></Suspense>;
}
