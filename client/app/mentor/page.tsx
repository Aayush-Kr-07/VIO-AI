"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import axiosInstance from "@/lib/axios";

type Report = {
  id: string;
  domain: string;
  companyName: string;
  score: number;
  feedback: string;
  improvementSuggestions: string;
  createdAt: string;
  student?: { name: string; email: string };
  mentorFeedback?: { feedback: string; advice: string; createdAt: string }[];
};
type StudentPerformance = { student: { _id: string; name: string; email: string }; interviews: number; averageScore: number; latestScore: number; domains: string[] };
const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") return data.message;
    }
  }
  return fallback;
};

export default function MentorPage() {
  const { isAllowed } = useRoleGuard(["mentor"]);
  const [reports, setReports] = useState<Report[]>([]);
  const [performance, setPerformance] = useState<StudentPerformance[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [advice, setAdvice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAllowed) return;
    Promise.all([axiosInstance.get("/api/rbac/mentor/reports"), axiosInstance.get("/api/rbac/mentor/performance")])
      .then(([reportsResponse, performanceResponse]) => { setReports(reportsResponse.data.reports || []); setPerformance(performanceResponse.data.students || []); })
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load student reports."));
  }, [isAllowed]);

  const submitFeedback = async (reportId: string) => {
    if (!feedback.trim() || !advice.trim()) { setError("Add both feedback and advice before saving."); return; }
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(`/api/rbac/mentor/reports/${reportId}/feedback`, { feedback, advice });
      setReports((current) => current.map((report) => report.id === reportId ? { ...report, mentorFeedback: [...(report.mentorFeedback || []), data.feedback] } : report));
      setFeedback(""); setAdvice(""); setSelectedReport(null); setError("");
    } catch (requestError: unknown) { setError(getErrorMessage(requestError, "Unable to save mentor feedback.")); }
    finally { setSaving(false); }
  };

  if (!isAllowed) return null;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Mentor workspace</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Student performance</h1>
        <p className="mt-3 text-slate-600">Review completed interviews and identify the next useful coaching step.</p>
      </header>
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-slate-950">Performance overview</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{performance.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No student performance data yet.</p> : performance.map((item) => <article key={item.student._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-950">{item.student.name}</h3><p className="text-sm text-slate-500">{item.student.email}</p><div className="mt-4 flex items-end justify-between"><div><p className="text-xs uppercase tracking-wide text-slate-500">Average score</p><p className="text-3xl font-black text-blue-700">{item.averageScore}/100</p></div><p className="text-right text-xs text-slate-500">{item.interviews} interview{item.interviews === 1 ? "" : "s"}<br />Latest: {item.latestScore}/100</p></div><p className="mt-3 text-xs text-slate-600">Domains: {item.domains.join(", ")}</p></article>)}</div>
      </section>
      <section className="mt-8 space-y-4">
        {reports.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No completed student reports yet.</p> : reports.map((report) => (
          <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="text-lg font-bold text-slate-950">{report.student?.name || "Student"}</h2><p className="text-sm text-slate-500">{report.student?.email} · {report.domain} · {report.companyName}</p></div>
              <p className="text-2xl font-black text-blue-700">{report.score}/100</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{report.feedback || "No feedback was saved."}</p>
            <p className="mt-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><strong>Next step:</strong> {report.improvementSuggestions || "Add a focused practice exercise."}</p>
            {report.mentorFeedback?.length ? <div className="mt-4 space-y-2">{report.mentorFeedback.map((item, index) => <div key={`${report.id}-mentor-${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm"><p className="font-semibold text-emerald-900">Mentor feedback</p><p className="mt-1 text-emerald-800">{item.feedback}</p><p className="mt-2 text-emerald-900"><strong>Advice:</strong> {item.advice}</p></div>)}</div> : null}
            {selectedReport === report.id ? <div className="mt-4 rounded-xl border border-blue-200 bg-slate-50 p-4"><label className="text-sm font-semibold text-slate-900" htmlFor={`feedback-${report.id}`}>Feedback</label><textarea id={`feedback-${report.id}`} value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={2000} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" placeholder="What did the student do well or need to improve?" /><label className="mt-3 block text-sm font-semibold text-slate-900" htmlFor={`advice-${report.id}`}>Advice</label><textarea id={`advice-${report.id}`} value={advice} onChange={(event) => setAdvice(event.target.value)} maxLength={2000} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" placeholder="Give a concrete next practice step." /><div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => void submitFeedback(report.id)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save feedback"}</button><button type="button" onClick={() => setSelectedReport(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button></div></div> : <button type="button" onClick={() => setSelectedReport(report.id)} className="mt-4 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Give feedback and advice</button>}
          </article>
        ))}
      </section>
    </main>
  );
}