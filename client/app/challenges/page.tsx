"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import axios from "axios";

const categories = ["All", "HR", "Technical", "Aptitude", "Domain-Specific"];
type Challenge = { _id: string; title: string; category: string; prompt: string; difficulty: string; generatedBy: string; attempt: { score: number; points: number; feedback: string } | null };
type Stats = { attempted: number; completed: number; averageScore: number; totalPoints: number; rank: string; streak: number; leaderboardPosition: number; badges: { name: string; description: string }[]; recentAttempts: { score: number; points: number; feedback: string; completedAt: string }[] };
type Leader = { position: number; name: string; points: number; completed: number; averageScore: number; current: boolean };

const categoryTone: Record<string, string> = { HR: "bg-rose-50 text-rose-700 border-rose-200", Technical: "bg-blue-50 text-blue-700 border-blue-200", Aptitude: "bg-amber-50 text-amber-700 border-amber-200", "Domain-Specific": "bg-emerald-50 text-emerald-700 border-emerald-200" };

export default function ChallengesPage() {
  const { isLoggedIn, isLoading } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [{ data: challengeData }, { data: leaderboardData }] = await Promise.all([axiosInstance.get("/api/challenges"), axiosInstance.get("/api/challenges/leaderboard")]);
      setChallenges(challengeData.challenges); setStats(challengeData.stats); setLeaders(leaderboardData.leaderboard);
    } catch (err: unknown) { setError(axios.isAxiosError(err) ? err.response?.data?.message || "Unable to load challenges." : "Unable to load challenges."); }
    finally { setLoading(false); }
  };

  // The async loader owns its request lifecycle; this effect only reacts to auth.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isLoggedIn) load(); }, [isLoggedIn]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!activeId || answer.trim().length < 20) { setError("Write at least 20 characters so the AI can evaluate your answer."); return; }
    setSubmitting(true); setError("");
    try { const { data } = await axiosInstance.post(`/api/challenges/${activeId}/submit`, { answer }); setChallenges((items) => items.map((item) => item._id === activeId ? { ...item, attempt: data.attempt } : item)); setStats(data.stats); setMessage(`Challenge scored ${data.attempt.score}/100. You earned ${data.attempt.points} points.`); setAnswer(""); setActiveId(null); }
    catch (err: unknown) { setError(axios.isAxiosError(err) ? err.response?.data?.message || "Unable to submit this challenge." : "Unable to submit this challenge."); }
    finally { setSubmitting(false); }
  };

  if (isLoading || !isLoggedIn) return <main className="mx-auto max-w-6xl px-4 py-14"><p className="text-slate-600">Sign in to enter the Challenge Arena.</p></main>;
  const visible = selectedCategory === "All" ? challenges : challenges.filter((challenge) => challenge.category === selectedCategory);
  const activeChallenge = challenges.find((challenge) => challenge._id === activeId);

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
    <header className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10"><div className="relative z-10 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Peer Challenge Arena</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Turn interview practice into momentum.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Fresh AI-crafted challenges across the skills interviewers actually test. Build your score, sharpen your thinking, and climb one answer at a time.</p></div><div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[28px] border-cyan-400/20" /><div className="absolute -bottom-24 right-20 h-48 w-48 rounded-full border-[18px] border-amber-300/20" /></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Arena points</p><p className="mt-2 text-2xl font-bold text-slate-950">{stats?.totalPoints ?? 0}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Current rank</p><p className="mt-2 text-sm font-bold text-blue-700">{stats?.rank ?? "New Challenger"}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Practice streak</p><p className="mt-2 text-2xl font-bold text-slate-950">{stats?.streak ?? 0}<span className="ml-1 text-sm font-medium text-slate-500">days</span></p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Leaderboard</p><p className="mt-2 text-2xl font-bold text-slate-950">#{stats?.leaderboardPosition ?? "-"}</p></div></section>
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_330px]"><section><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold text-slate-950">Today&apos;s challenges</h2><p className="mt-1 text-sm text-slate-500">Complete each once. AI evaluates the quality of your reasoning.</p></div><div className="flex flex-wrap gap-2">{categories.map((category) => <button type="button" key={category} onClick={() => setSelectedCategory(category)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selectedCategory === category ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>{category}</button>)}</div></div><div className="mt-5 space-y-4">{loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Generating today&apos;s challenges...</p> : visible.map((challenge) => <article key={challenge._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${categoryTone[challenge.category]}`}>{challenge.category}</span><span className="text-xs font-semibold text-slate-500">{challenge.difficulty}</span><span className="ml-auto text-xs text-slate-400">{challenge.generatedBy === "ai" ? "AI generated" : "Daily practice"}</span></div><h3 className="mt-4 text-lg font-bold text-slate-950">{challenge.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{challenge.prompt}</p>{challenge.attempt ? <div className="mt-5 rounded-xl bg-emerald-50 p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-emerald-900">Completed</p><p className="text-lg font-bold text-emerald-700">{challenge.attempt.score}/100</p></div><p className="mt-1 text-xs text-emerald-800">{challenge.attempt.points} points earned</p></div> : <button type="button" onClick={() => { setActiveId(challenge._id); setMessage(""); setError(""); }} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">Start challenge</button>}</article>)}</div></section><aside className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Your progress</h2><div className="mt-4 grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-950">{stats?.completed ?? 0}</p><p className="text-[11px] text-slate-500">Completed</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-950">{stats?.averageScore ?? 0}</p><p className="text-[11px] text-slate-500">Avg score</p></div></div><h3 className="mt-6 text-sm font-bold text-slate-900">Badges</h3><div className="mt-3 space-y-2">{stats?.badges.length ? stats.badges.map((badge) => <div key={badge.name} className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3"><span className="text-xl">★</span><div><p className="text-xs font-bold text-amber-900">{badge.name}</p><p className="mt-0.5 text-[11px] text-amber-800">{badge.description}</p></div></div>) : <p className="text-xs text-slate-500">Complete a challenge to unlock your first badge.</p>}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-950">Leaderboard</h2><span className="text-xs font-semibold text-slate-400">Top 25</span></div><div className="mt-4 space-y-2">{leaders.length ? leaders.slice(0, 8).map((leader) => <div key={leader.position} className={`flex items-center gap-3 rounded-xl p-3 ${leader.current ? "bg-blue-50 ring-1 ring-blue-200" : "bg-slate-50"}`}><span className="w-5 text-center text-xs font-bold text-slate-500">{leader.position}</span><span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{leader.name}{leader.current ? " (you)" : ""}</span><span className="text-xs font-bold text-blue-700">{leader.points} pts</span></div>) : <p className="text-xs text-slate-500">Be the first to score.</p>}</div></section></aside></div>
    {activeChallenge && <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center"><form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${categoryTone[activeChallenge.category]}`}>{activeChallenge.category}</span><h2 className="mt-4 text-2xl font-bold text-slate-950">{activeChallenge.title}</h2></div><button type="button" onClick={() => setActiveId(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Close</button></div><p className="mt-4 text-sm leading-6 text-slate-700">{activeChallenge.prompt}</p><textarea required minLength={20} maxLength={6000} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your interview answer with reasoning and examples..." className="mt-5 min-h-40 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{answer.length}/6000 characters</span><button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? "AI is evaluating..." : "Submit for AI score"}</button></div></form></div>}
  </main>;
}
