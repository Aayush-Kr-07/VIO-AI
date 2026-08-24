"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import axiosInstance from "@/lib/axios";
import axios from "axios";

function VerifyEmailContent() {
  const params = useSearchParams(); const router = useRouter(); const [message, setMessage] = useState("Checking your verification code..."); const [error, setError] = useState("");
  useEffect(() => { const verify = async () => { try { const { data } = await axiosInstance.get(`/api/auth/verify-email?token=${encodeURIComponent(params.get("token") || "")}&email=${encodeURIComponent(params.get("email") || "")}`); setMessage(data.message); } catch (err: unknown) { setError(axios.isAxiosError(err) ? err.response?.data?.message || "This verification link is invalid or expired." : "This verification link is invalid or expired."); } }; if (params.get("token") && params.get("email")) verify(); else setError("Verification link is incomplete."); }, [params]);
  return <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-12"><div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg"><h1 className="text-2xl font-bold text-slate-950">Email verification</h1><p className={`mt-4 text-sm ${error ? "text-red-700" : "text-slate-600"}`}>{error || message}</p>{!error && message !== "Checking your verification code..." && <button onClick={() => router.push("/login")} className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Continue to sign in</button>}{error && <Link className="mt-6 inline-block text-sm font-semibold text-blue-700" href="/register">Return to signup</Link>}</div></main>;
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="mx-auto max-w-md px-4 py-12">Verifying...</main>}><VerifyEmailContent /></Suspense>;
}
