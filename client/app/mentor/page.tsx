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
};

export default function MentorPage() {
  const { isAllowed } = useRoleGuard(["mentor"]);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAllowed) return;
    axiosInstance.get("/api/rbac/mentor/reports")
      .then(({ data }) => setReports(data.reports || []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load student reports."));
  }, [isAllowed]);

  if (!isAllowed) return null;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Mentor workspace</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Student performance</h1>
        <p className="mt-3 text-slate-600">Review completed interviews and identify the next useful coaching step.</p>
      </header>
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <section className="mt-8 space-y-4">
        {reports.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No completed student reports yet.</p> : reports.map((report) => (
          <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="text-lg font-bold text-slate-950">{report.student?.name || "Student"}</h2><p className="text-sm text-slate-500">{report.student?.email} · {report.domain} · {report.companyName}</p></div>
              <p className="text-2xl font-black text-blue-700">{report.score}/100</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{report.feedback || "No feedback was saved."}</p>
            <p className="mt-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><strong>Next step:</strong> {report.improvementSuggestions || "Add a focused practice exercise."}</p>
          </article>
        ))}
      </section>
    </main>
  );
}