"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type ChatResponseData = {
  ats_score?: number;
  issues?: string[];
  improvements?: string[];
  summary?: string;
  jobs?: string[];
  roadmap?: string[];
  missing_skills?: string[];
  answer?: string;
  raw?: string;
};

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "ai"; data: ChatResponseData };

type Toast = {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
};

type ToastFn = (message: string, tone?: Toast["tone"]) => void;

function clampScore(score?: number) {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function ProgressRing({
  value,
  color,
}: {
  value: number;
  color: "pink" | "teal" | "amber";
}) {
  const score = clampScore(value);
  const circumference = 2 * Math.PI * 38;
  const strokeOffset = circumference - (score / 100) * circumference;
  const stroke =
    color === "pink" ? "#ef5c8d" : color === "teal" ? "#8bcfd0" : "#f2b84b";

  return (
    <div className="relative h-24 w-24">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" stroke="#d6c8d4" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke={stroke}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-white">
        {score}%
      </div>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-[20px] border px-4 py-3 shadow-[0_20px_45px_rgba(107,72,105,0.12)] backdrop-blur-sm transition duration-300 ${
            toast.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : toast.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-[#eadde6] bg-white text-[#5d465a]"
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

function UploadLoader() {
  return (
    <div className="mt-4 rounded-[24px] border border-[#eadde6] bg-[#fbf7f8] p-5">
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#f1e7ea]">
          <div className="absolute h-14 w-14 animate-ping rounded-full bg-[#dcc7d5] opacity-40" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#8bcfd0] text-white">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:300ms]" />
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#5f465b]">Uploading your resume</p>
          <p className="mt-1 text-sm text-[#7c697b]">
            Parsing PDF text and preparing your dashboard insights...
          </p>
        </div>
      </div>
    </div>
  );
}

function SidebarIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#6a4d68] shadow-sm ring-1 ring-white/60 transition duration-300 group-hover:scale-105 group-hover:shadow-md">
      {children}
    </div>
  );
}

function MetricCard({
  title,
  value,
  color,
  locked,
}: {
  title: string;
  value: number;
  color: "pink" | "teal" | "amber";
  locked?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] bg-[#a88ca3] p-4 text-white shadow-[0_18px_40px_rgba(112,84,110,0.16)] ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(112,84,110,0.22)]">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-16 rounded-b-full bg-white/10 blur-2xl transition duration-300 group-hover:bg-white/15" />
      <p className="text-sm font-medium">{title}</p>
      <div className="relative mt-3 flex justify-center">
        <ProgressRing value={value} color={color} />
      </div>
      {locked && (
        <div className="pointer-events-none absolute left-1/2 top-3 hidden -translate-x-1/2 rounded-full bg-white px-3 py-2 text-xs font-medium text-[#6d5870] shadow-md group-hover:block">
          Upload your resume to know your score
        </div>
      )}
    </div>
  );
}

function AICard({ data }: { data: ChatResponseData }) {
  if (data.raw) {
    return (
      <div className="rounded-[28px] bg-white p-5 text-sm leading-6 text-[#5f4b5d] shadow-[0_20px_45px_rgba(107,72,105,0.08)] ring-1 ring-white/70 transition duration-300 hover:shadow-[0_24px_55px_rgba(107,72,105,0.12)]">
        <p className="whitespace-pre-line">{data.raw}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] bg-[#eadde6] p-5 shadow-[0_20px_45px_rgba(107,72,105,0.08)] ring-1 ring-white/40 transition duration-300">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] bg-white p-5 ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(107,72,105,0.12)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#aa8198]">
                ATS Snapshot
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#5f465b]">Resume Strength</h3>
            </div>
            <div className="rounded-[24px] bg-[#a88ca3] px-5 py-4 text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <p className="text-3xl font-semibold">{clampScore(data.ats_score)}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/80">Score</p>
            </div>
          </div>

          {data.summary && (
            <div className="mt-4 rounded-[24px] bg-[#f7f1f5] p-4 ring-1 ring-white/60 transition duration-300 hover:bg-white">
              <p className="text-sm font-semibold text-[#7f6179]">Summary</p>
              <p className="mt-2 text-sm leading-6 text-[#5f4b5d]">{data.summary}</p>
            </div>
          )}

          {data.answer && (
            <div className="mt-4 rounded-[24px] bg-[#f7f1f5] p-4 ring-1 ring-white/60 transition duration-300 hover:bg-white">
              <p className="text-sm font-semibold text-[#7f6179]">Direct Answer</p>
              <p className="mt-2 text-sm leading-6 text-[#5f4b5d]">{data.answer}</p>
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[28px] bg-white p-5 ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(107,72,105,0.12)]">
            <p className="text-sm font-semibold text-[#8c627d]">Missing Skills</p>
            <ul className="mt-3 space-y-2 text-sm text-[#5f4b5d]">
              {(data.missing_skills ?? []).map((skill, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#ef5c8d]" />
                  <span>{skill}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] bg-white p-5 ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(107,72,105,0.12)]">
            <p className="text-sm font-semibold text-[#8c627d]">Fix First</p>
            <ul className="mt-3 space-y-2 text-sm text-[#5f4b5d]">
              {(data.improvements ?? []).map((improvement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#8bcfd0]" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <section className="rounded-[28px] bg-white p-5 ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(107,72,105,0.12)]">
          <p className="text-sm font-semibold text-[#8c627d]">Best-Fit Job Roles</p>
          <div className="mt-4 grid gap-3">
            {(data.jobs ?? []).map((job, index) => (
              <div key={index} className="rounded-[22px] bg-[#f7f1f5] px-4 py-3 text-sm font-medium text-[#5f4b5d] ring-1 ring-white/60 transition duration-300 hover:bg-white">
                {job}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5 ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(107,72,105,0.12)]">
          <p className="text-sm font-semibold text-[#8c627d]">Learning Plan</p>
          <div className="mt-4 space-y-3">
            {(data.roadmap ?? []).map((step, index) => (
              <div key={index} className="flex gap-3 rounded-[22px] bg-[#f7f1f5] p-4 ring-1 ring-white/60 transition duration-300 hover:bg-white">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a88ca3] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-[#5f4b5d]">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const showToast: ToastFn = (message, tone = "info") => {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;
    setToasts((prev) => [...prev, { id, tone, message }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  };

  useEffect(() => {
    if (!supabase) {
      return;
    }
    let isActive = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return;
      }

      setUser(session?.user ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    if (!supabase) {
      showToast("Supabase not configured.", "error");
      return;
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        showToast("Enter your email first.", "error");
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (error) {
        throw error;
      }

      showToast("Magic link sent. Check your inbox and spam folder.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to sign in.", "error");
    }
  };

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5edef] p-4">
        <ToastStack toasts={toasts} />
        <div className="relative w-full max-w-md overflow-hidden rounded-[36px] border border-[#eadde6] bg-white p-8 shadow-[0_24px_60px_rgba(107,72,105,0.12)] ring-1 ring-white/70">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-b-full bg-[#eadde6] opacity-70 blur-3xl" />
          <h1 className="text-2xl font-semibold text-[#5f465b]">Configuration Required</h1>
          <p className="mt-3 text-sm leading-6 text-[#7a6478]">
            Add your Supabase environment variables in `.env.local` to use authentication.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5edef] p-4">
        <ToastStack toasts={toasts} />
        <div className="w-full max-w-md rounded-[36px] border border-[#eadde6] bg-white p-8 shadow-[0_24px_60px_rgba(107,72,105,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#aa8198]">
            AI Career Agent
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#5f465b]">
            Welcome Back
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#7a6478]">
            Sign in to unlock your resume dashboard, ATS insights, and career roadmap.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void login();
            }}
            className="mt-8 space-y-4"
          >
            <input
              type="email"
              className="w-full rounded-[24px] border border-[#eadde6] bg-[#fbf7f8] px-5 py-4 text-[#5f465b] outline-none transition duration-300 focus:border-[#c8a5bd] focus:ring-2 focus:ring-[#eadde6] hover:bg-white"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full rounded-[24px] bg-[#8e6c88] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(142,108,136,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#7c5a77] hover:shadow-[0_18px_34px_rgba(142,108,136,0.24)]"
            >
              Send Magic Link
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastStack toasts={toasts} />
      <Chat user={user} showToast={showToast} onSignedOut={() => setUser(null)} />
    </>
  );
}

function Chat({
  user,
  showToast,
  onSignedOut,
}: {
  user: User;
  showToast: ToastFn;
  onSignedOut: () => void;
}) {
  const [resume, setResume] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [hasUnlockedChat, setHasUnlockedChat] = useState(false);

  const latestResponse = messages
    .filter((message): message is { role: "ai"; data: ChatResponseData } => message.role === "ai")
    .at(-1)?.data;
  const hasResume = Boolean(resume.trim());

  const signOut = async () => {
    if (!supabase) {
      showToast("Supabase not configured.", "error");
      return;
    }

    try {
      setIsSigningOut(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      onSignedOut();
      showToast("Signed out successfully.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to sign out.", "error");
    } finally {
      setIsSigningOut(false);
    }
  };

  const uploadPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingResume(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP error! status: ${res.status}`);
      }

      setResume(data.text);
      setResumeInput(data.text);
      setHasUnlockedChat(false);
      setMessages([]);
      showToast("Resume uploaded successfully.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to upload PDF.", "error");
    } finally {
      setIsUploadingResume(false);
      e.target.value = "";
    }
  };

  const applyPastedResume = () => {
    const normalizedResume = resumeInput.trim();

    if (!normalizedResume) {
      showToast("Paste your resume details first.", "error");
      return;
    }

    setResume(normalizedResume);
    setHasUnlockedChat(false);
    setMessages([]);
    showToast("Resume details added successfully.", "success");
  };

  const sendMessage = async (messageOverride?: string, options?: { unlockChat?: boolean }) => {
    const userMessage = (messageOverride ?? input).trim();

    if (!userMessage) return;

    if (!resume.trim()) {
      showToast("Need to add resume details.", "error");
      return;
    }

    if (!options?.unlockChat && !hasUnlockedChat) {
      showToast("Click Know About Your CV first to unlock chat.", "info");
      return;
    }

    setInput("");
    setIsLoading(true);

    try {
      setMessages((prev) => [...prev, { role: "user", text: userMessage }]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          resume,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP error! status: ${res.status}`);
      }

      if (options?.unlockChat) {
        setHasUnlockedChat(true);
        showToast("Your CV analysis is ready.", "success");
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", data: data.data ?? { raw: "No response received." } },
      ]);
    } catch (error) {
      setMessages((prev) => prev.slice(0, -1));
      showToast(error instanceof Error ? error.message : "Failed to send message.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const runResumeOverview = async () => {
    await sendMessage(
      "Give me a full resume review with ATS score, missing skills, suitable job roles, key improvements, and a learning plan with timeline.",
      { unlockChat: true }
    );
  };

  return (
    <div className="min-h-screen bg-[#f5edef] p-4 text-[#5f465b]">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1500px] gap-4 rounded-[38px] border border-[#eadde6] bg-[#f8f1f1] p-4 shadow-[0_24px_60px_rgba(107,72,105,0.08)] lg:grid-cols-[250px_minmax(0,1fr)_230px]">
        <aside className="self-start rounded-[30px] bg-[#e7dde2] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] lg:sticky lg:top-4">
          <div className="rounded-[28px] bg-[#ded1d8] p-5 ring-1 ring-white/40">
            <p className="text-3xl font-semibold tracking-tight text-[#5f465b]">Careertech</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8bcfd0] text-xl font-semibold text-white">
                {user.email?.slice(0, 1).toUpperCase() ?? "U"}
              </div>
              <div>
                <p className="font-semibold text-[#5f465b]">{user.email?.split("@")[0] ?? "User"}</p>
                <p className="text-sm text-[#80657a]">Career dashboard</p>
              </div>
            </div>
          </div>

          <nav className="mt-5 space-y-2">
            <div className="group flex items-center gap-3 rounded-[22px] bg-white px-3 py-2.5 shadow-sm ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <SidebarIcon>1</SidebarIcon>
              <span className="text-sm font-medium">Dashboard</span>
            </div>
          </nav>

          <button
            onClick={() => void signOut()}
            disabled={isSigningOut}
            className="group mt-6 flex w-full items-center gap-3 rounded-[22px] bg-white px-4 py-3 text-left text-sm font-medium text-[#6d5870] shadow-sm ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:bg-[#f7f1f5] hover:shadow-md disabled:opacity-60"
          >
            <SidebarIcon>&#x238B;</SidebarIcon>
            <span>{isSigningOut ? "Signing out..." : "Log out"}</span>
          </button>
        </aside>

        <main className="rounded-[30px] bg-[#fbf7f8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#aa8198]">
                Resume Command Center
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#5f465b]">
                Hello, User!
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex min-w-[260px] items-center gap-3 rounded-full border border-[#eadde6] bg-[#f1e7ea] px-4 py-3 text-sm text-[#8a7284] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-white/30 transition duration-300 hover:bg-white">
                <span>&#x2315;</span>
                <span>Resume insights, ATS, jobs...</span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1e7ea] text-[#6d5870] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-white/30 transition duration-300 hover:scale-105">
                <span className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_14px_rgba(109,88,112,0.45)]" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-[30px] bg-[#eadde6] p-5 ring-1 ring-white/35 transition duration-300 hover:shadow-[0_18px_40px_rgba(107,72,105,0.1)]">
              <p className="text-lg font-semibold text-[#5f465b]">Resume Input</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] bg-white p-4 ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(107,72,105,0.1)]">
                  <p className="font-medium text-[#6d5870]">Upload PDF</p>
                  <p className="mt-2 text-sm leading-6 text-[#7c697b]">
                    Parse your resume from a PDF and load it into the dashboard.
                  </p>
                  <label className="mt-4 inline-flex cursor-pointer items-center rounded-full bg-[#8e6c88] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(142,108,136,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#7c5a77] hover:shadow-[0_16px_28px_rgba(142,108,136,0.24)]">
                    {isUploadingResume ? "Uploading..." : "Choose PDF"}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={uploadPDF}
                      className="hidden"
                      disabled={isUploadingResume}
                    />
                  </label>
                  {isUploadingResume && <UploadLoader />}
                </div>

                <div className="rounded-[24px] bg-white p-4 ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(107,72,105,0.1)]">
                  <p className="font-medium text-[#6d5870]">Paste Resume Text</p>
                  <textarea
                    value={resumeInput}
                    onChange={(e) => setResumeInput(e.target.value)}
                    placeholder="Paste your CV, projects, skills, education, and achievements here..."
                    className="mt-3 min-h-36 w-full rounded-[20px] border border-[#eadde6] bg-[#fbf7f8] px-4 py-3 text-sm text-[#5f465b] outline-none transition duration-300 focus:border-[#c8a5bd] focus:ring-2 focus:ring-[#eadde6] hover:bg-white"
                  />
                  <button
                    onClick={applyPastedResume}
                    className="mt-3 rounded-full bg-[#5f465b] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,70,91,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#503a4d] hover:shadow-[0_16px_28px_rgba(95,70,91,0.24)]"
                  >
                    Use This Resume Text
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] bg-[#eadde6] p-5 ring-1 ring-white/35 transition duration-300 hover:shadow-[0_18px_40px_rgba(107,72,105,0.1)]">
              <p className="text-lg font-semibold text-[#5f465b]">Know About Your CV</p>
              <p className="mt-2 text-sm leading-6 text-[#7c697b]">
                Generate a polished report with ATS score, missing skillset, best-fit roles, and a practical learning plan.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  "ATS score and resume readiness",
                  "Missing skills and stronger positioning",
                  "Job roles and learning roadmap",
                ].map((item) => (
                  <div key={item} className="rounded-[22px] bg-white px-4 py-4 text-sm text-[#5f465b] ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(107,72,105,0.1)]">
                    {item}
                  </div>
                ))}
              </div>
              <button
                onClick={() => void runResumeOverview()}
                disabled={!resume.trim() || isLoading}
                className="mt-5 rounded-full bg-[#8bcfd0] px-5 py-3 text-sm font-semibold text-[#22484b] shadow-[0_12px_26px_rgba(139,207,208,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#79bebf] hover:shadow-[0_18px_32px_rgba(139,207,208,0.28)] disabled:cursor-not-allowed disabled:bg-[#d6d0d4] disabled:text-[#8e7f8e]"
              >
                Know About Your CV
              </button>
            </section>
          </div>

          <div className="mt-4 rounded-[30px] bg-[#eadde6] p-5 ring-1 ring-white/35 transition duration-300 hover:shadow-[0_18px_40px_rgba(107,72,105,0.1)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-[#5f465b]">Career Conversation</p>
                <p className="mt-1 text-sm text-[#7c697b]">
                  Chat unlocks after you run the CV insight once.
                </p>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#aa8198] ring-1 ring-white/70 shadow-sm">
                {hasUnlockedChat ? "Unlocked" : "Locked"}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void sendMessage()}
                onFocus={() => {
                  if (!resume.trim()) {
                    showToast("Need to add resume details.", "error");
                    return;
                  }

                  if (!hasUnlockedChat) {
                    showToast("Click Know About Your CV first to unlock chat.", "info");
                  }
                }}
                placeholder="Ask about jobs, resume improvements, interview positioning..."
                className={`flex-1 rounded-full border px-5 py-4 text-sm outline-none transition duration-300 ${
                  hasUnlockedChat
                    ? "border-[#eadde6] bg-white text-[#5f465b] focus:border-[#c8a5bd] focus:ring-2 focus:ring-[#eadde6] hover:shadow-[0_10px_22px_rgba(107,72,105,0.08)]"
                    : "cursor-not-allowed border-[#e4d8e0] bg-[#f4edf0] text-[#9a8a98]"
                }`}
                disabled={isLoading}
                readOnly={!hasUnlockedChat}
              />
              <button
                onClick={() => {
                  if (!resume.trim()) {
                    showToast("Need to add resume details.", "error");
                    return;
                  }

                  if (!hasUnlockedChat) {
                    showToast("Click Know About Your CV first to unlock chat.", "info");
                    return;
                  }

                  void sendMessage();
                }}
                disabled={isLoading || (hasUnlockedChat && !input.trim())}
                className="rounded-full bg-[#8e6c88] px-6 py-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(142,108,136,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#7c5a77] hover:shadow-[0_16px_28px_rgba(142,108,136,0.24)] disabled:bg-[#d3c8d1] disabled:text-[#8e7f8e]"
              >
                Send
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[30px] bg-[#eadde6] p-5 ring-1 ring-white/35 transition duration-300 hover:shadow-[0_18px_40px_rgba(107,72,105,0.1)]">
            <p className="text-lg font-semibold text-[#5f465b]">My Insights</p>
            <div className="mt-4 space-y-4">
              {messages.length === 0 ? (
                <div className="rounded-[24px] bg-white p-8 text-center text-sm text-[#7c697b] ring-1 ring-white/70">
                  Run your CV insight to start seeing ATS score, role suggestions, and roadmap cards here.
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={message.role === "user" ? "flex justify-end" : ""}>
                    {message.role === "user" ? (
                      <div className="max-w-xl rounded-[24px] bg-[#8e6c88] px-5 py-4 text-sm text-white shadow-[0_16px_34px_rgba(142,108,136,0.22)] transition duration-300 hover:-translate-y-0.5">
                        {message.text}
                      </div>
                    ) : (
                      <AICard data={message.data} />
                    )}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="rounded-[24px] bg-white px-5 py-4 text-sm text-[#7c697b] ring-1 ring-white/70">
                  Analyzing your resume...
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="rounded-[30px] bg-[#e7dde2] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
          <MetricCard
            title="ATS Score"
            value={hasResume ? (latestResponse?.ats_score ?? 0) : 0}
            color="pink"
            locked={!hasResume}
          />
          <div className="mt-3">
            <MetricCard
              title="Skills Match"
              value={hasResume ? Math.max(0, 100 - (latestResponse?.missing_skills?.length ?? 0) * 10) : 0}
              color="teal"
              locked={!hasResume}
            />
          </div>
          <div className="mt-3">
            <MetricCard
              title="Readiness"
              value={hasResume ? Math.min(100, 45 + (latestResponse?.jobs?.length ?? 0) * 10) : 0}
              color="amber"
              locked={!hasResume}
            />
          </div>

          <div className="mt-3 rounded-[28px] bg-white p-4 ring-1 ring-white/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(107,72,105,0.1)]">
            <p className="text-sm font-semibold text-[#8c627d]">Quick Notes</p>
            <div className="mt-3 space-y-2.5 text-sm text-[#5f4b5d]">
              <div className="rounded-[20px] bg-[#f7f1f5] px-4 py-2.5 ring-1 ring-white/60 transition duration-300 hover:bg-white">
                Resume loaded: {resume ? "Yes" : "No"}
              </div>
              <div className="rounded-[20px] bg-[#f7f1f5] px-4 py-2.5 ring-1 ring-white/60 transition duration-300 hover:bg-white">
                Chat unlocked: {hasUnlockedChat ? "Yes" : "No"}
              </div>
              <div className="rounded-[20px] bg-[#f7f1f5] px-4 py-2.5 ring-1 ring-white/60 transition duration-300 hover:bg-white">
                Suggested roles: {latestResponse?.jobs?.length ?? 0}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
