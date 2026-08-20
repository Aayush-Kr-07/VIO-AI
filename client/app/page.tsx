import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Globe,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

const featureCards = [
  {
    icon: Globe,
    title: "8+ Domains",
    description: "Practice interviews across software engineering, product, data, marketing, and more.",
  },
  {
    icon: Zap,
    title: "24/7 Available",
    description: "Train anytime with on-demand mock interviews that fit your schedule and pace.",
  },
  {
    icon: BrainCircuit,
    title: "AI Powered",
    description: "Get smart follow-up questions and realistic interview simulations driven by AI.",
  },
  {
    icon: Target,
    title: "Instant Scoring",
    description: "Receive quick feedback on communication, clarity, and confidence after each session.",
  },
];

const extraHighlights = [
  "Role-based interview questions",
  "Live feedback with actionable tips",
  "Resume-aware mock rounds",
  "Track improvement over time",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(to_bottom,_#eff6ff,_#ffffff_30%,_#f0f9ff)] text-slate-900">
      <section className="mx-auto flex max-w-7xl flex-col px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Interview readiness, reimagined
            </div>

            <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Master your Interview Skills
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              Practice AI powered mock interviews tailored to your domain.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-400 hover:text-blue-800"
              >
                Login
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {extraHighlights.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-[0_30px_80px_rgba(37,99,235,0.14)] ring-1 ring-blue-100">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-500 p-6 text-white">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Mock Session</p>
                    <h2 className="mt-2 text-2xl font-bold">Product Manager round</h2>
                  </div>
                  <div className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                    Live AI
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl bg-slate-950/10 p-4 backdrop-blur-sm">
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Question</p>
                    <p className="mt-2 text-base leading-7 text-white">
                      Tell me about a product you improved and how you measured impact.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/10 p-3">
                      <p className="text-blue-100">Confidence</p>
                      <p className="mt-1 text-xl font-bold">88%</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                      <p className="text-blue-100">Score</p>
                      <p className="mt-1 text-xl font-bold">92/100</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
