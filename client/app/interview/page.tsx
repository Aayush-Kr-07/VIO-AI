"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatContainer from "@/components/ChatContainer";
import { InputBox } from "@/components/InputBox";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { COMPANY_PROFILES } from "@/lib/companyProfiles";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface CompanyReport {
  strengths: string[];
  weakAreas: string[];
  companyFeedback: string;
  improvementSuggestions: string;
  meetsStandard: boolean;
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = error.response;
    if (
      typeof response === "object" &&
      response !== null &&
      "data" in response &&
      typeof response.data === "object" &&
      response.data !== null &&
      "message" in response.data &&
      typeof response.data.message === "string"
    ) {
      return response.data.message;
    }
  }
  return fallback;
}

export default function InterviewPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [domain, setDomain] = useState(() => {
    if (typeof window === "undefined") return "General";
    return new URLSearchParams(window.location.search).get("domain")?.trim() || "General";
  });
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [difficulty, setDifficulty] = useState("Easy");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const startInterview = async (selectedDomain: string, selectedCompanyId: string) => {
    try {
      setDomain(selectedDomain);
      setIsLoading(true);
      setError(null);
      const { data } = await axiosInstance.post("/api/interviews/start", {
        domain: selectedDomain,
        companyId: selectedCompanyId,
      });
      setSessionId(data.sessionId);
      setDifficulty(data.difficulty || "Easy");
      setMessages([
        {
          id: `${data.sessionId}-question`,
          content: data.question,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } catch (requestError: unknown) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Unable to start the interview. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [authLoading, isLoggedIn, router]);

  const handleSend = async (answer: string) => {
    if (!sessionId || isLoading || isComplete) return;

    setMessages((current) => [
      ...current,
      {
        id: `${sessionId}-answer-${questionsAnswered}`,
        content: answer,
        isUser: true,
        timestamp: new Date(),
      },
    ]);

    try {
      setIsLoading(true);
      setError(null);
      const { data } = await axiosInstance.post(
        "/api/interviews/submit-answer",
        { sessionId, answer, domain, questionsAnswered },
      );
      setDifficulty(data.difficulty || difficulty);
      setMessages((current) => [
        ...current,
        {
          id: `${sessionId}-score-${questionsAnswered}`,
          content: `Score: ${data.answerScore}/100 (${data.performanceLevel}). Next question difficulty: ${data.difficulty}.`,
          isUser: false,
          timestamp: new Date(),
        },
        ...(data.nextQuestion
          ? [
              {
                id: `${sessionId}-question-${questionsAnswered + 1}`,
                content: data.nextQuestion,
                isUser: false,
                timestamp: new Date(),
              },
            ]
          : []),
      ]);
      setQuestionsAnswered((count) => count + 1);
      setIsComplete(data.isComplete);
      if (data.isComplete) {
        setFinalScore(data.score ?? null);
        setReport(data.report || null);
      }
    } catch (requestError: unknown) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Unable to submit your answer. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const finishSession = useCallback(async () => {
    if (!sessionId || isFinishing || isComplete) return;
    setIsFinishing(true);
    try {
      const { data } = await axiosInstance.post("/api/interviews/finish", { sessionId });
      setIsComplete(true);
      setFinalScore(data.score ?? null);
      setReport(data.report || null);
    } catch (requestError: unknown) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Unable to finish the interview. Please try again.",
        ),
      );
      setIsFinishing(false);
    }
  }, [isComplete, isFinishing, sessionId]);

  useEffect(() => {
    if (!sessionId || isComplete || isFinishing) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          void finishSession();
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finishSession, sessionId, isComplete, isFinishing]);

  if (authLoading || !isLoggedIn) return null;

  const selectedCompany = COMPANY_PROFILES.find((company) => company.id === companyId);
  if (!companyId) {
    return (
      <main className="min-h-[calc(100vh-73px)] bg-blue-50/45 px-3 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Practice lab</p>
          <h1 className="mt-2 text-3xl font-black text-blue-950 sm:text-4xl">Choose your recruiter</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Each profile changes the interview style, question mix, technical focus, and evaluation bar.</p>
          <div className="mt-7 rounded-xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
            <label className="text-sm font-bold text-blue-950" htmlFor="practice-domain">Practice domain</label>
            <select id="practice-domain" value={domain} onChange={(event) => setDomain(event.target.value)} className="mt-2 w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm text-slate-800 sm:max-w-sm">
              {["General", "JavaScript/Node.js", "React", "Python", "Data Science", "DevOps", "System Design", "Database Design"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPANY_PROFILES.map((company) => (
              <button key={company.id} type="button" onClick={() => { setCompanyId(company.id); void startInterview(domain, company.id); }} className="rounded-xl border border-blue-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md">
                <div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-lg font-black text-white">{company.logo}</span><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{company.type}</span></div>
                <h2 className="mt-5 text-lg font-bold text-blue-950">{company.name}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{company.description}</p><p className="mt-4 text-xs font-semibold text-blue-700">{company.focus}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] flex-col bg-blue-50/45">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 py-5 sm:px-4 sm:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Live session</p>
            <h1 className="break-words text-2xl font-bold text-blue-950">{selectedCompany?.name} recruiter round</h1>
            <p className="mt-1 text-sm font-medium text-blue-700">
              {domain} · Difficulty: {difficulty}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className={`rounded-lg px-3 py-2 text-sm font-bold ${secondsRemaining <= 30 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
              {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={finishSession}
              className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Finish
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isComplete && report ? (
          <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">{selectedCompany?.name} performance report</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-3xl font-black text-blue-950">{report.meetsStandard ? "Meets expected standard" : "Needs more preparation"}</h2>
              <p className="text-2xl font-black text-blue-700">{finalScore ?? 0}/100</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2"><ReportList title="Strengths" items={report.strengths} tone="green" /><ReportList title="Weak areas" items={report.weakAreas} tone="amber" /></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><ReportBlock title="Company feedback" text={report.companyFeedback} /><ReportBlock title="Improve before applying" text={report.improvementSuggestions} /></div>
            <button type="button" onClick={() => router.push("/dashboard")} className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Back to dashboard</button>
          </section>
        ) : (
          <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm shadow-blue-100/60 sm:min-h-[520px]">
            <ChatContainer messages={messages} isLoading={isLoading && messages.length > 0} />
            <InputBox onSend={handleSend} disabled={!sessionId || isLoading || isFinishing} />
          </section>
        )}
      </div>
    </main>
  );
}

function ReportList({ title, items, tone }: { title: string; items: string[]; tone: "green" | "amber" }) {
  return <div className={`rounded-lg border p-4 ${tone === "green" ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}><h3 className="text-sm font-bold text-slate-900">{title}</h3><ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}

function ReportBlock({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4"><h3 className="text-sm font-bold text-blue-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>;
}
