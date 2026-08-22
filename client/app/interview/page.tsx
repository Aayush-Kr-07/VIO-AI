"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatContainer from "@/components/ChatContainer";
import { InputBox } from "@/components/InputBox";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
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
  const [domain, setDomain] = useState("General");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [difficulty, setDifficulty] = useState("Easy");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInterview = async (selectedDomain: string) => {
    try {
      setDomain(selectedDomain);
      setIsLoading(true);
      setError(null);
      const { data } = await axiosInstance.post("/api/interviews/start", {
        domain: selectedDomain,
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

  useEffect(() => {
    if (!isLoggedIn) return;

    const requestedDomain = new URLSearchParams(window.location.search).get(
      "domain",
    );
    const selectedDomain = requestedDomain?.trim() || "General";
    const requestTimer = window.setTimeout(() => {
      void startInterview(selectedDomain);
    }, 0);

    return () => window.clearTimeout(requestTimer);
  }, [isLoggedIn]);

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
      if (data.isComplete) router.push("/dashboard");
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
      await axiosInstance.post("/api/interviews/finish", { sessionId });
      setIsComplete(true);
      router.push("/dashboard");
    } catch (requestError: unknown) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Unable to finish the interview. Please try again.",
        ),
      );
      setIsFinishing(false);
    }
  }, [isComplete, isFinishing, router, sessionId]);

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

  return (
    <main className="flex min-h-[calc(100vh-73px)] flex-col bg-blue-50/45">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 py-5 sm:px-4 sm:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Live session</p>
            <h1 className="break-words text-2xl font-bold text-blue-950">{domain} interview</h1>
            <p className="mt-1 text-sm font-medium text-blue-700">
              Difficulty: {difficulty}
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

        <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm shadow-blue-100/60 sm:min-h-[520px]">
          <ChatContainer messages={messages} isLoading={isLoading && messages.length > 0} />
          <InputBox onSend={handleSend} disabled={!sessionId || isLoading || isFinishing} />
        </section>
      </div>
    </main>
  );
}
