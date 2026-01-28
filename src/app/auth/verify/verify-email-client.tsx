"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

// Simple client-safe helper: only uses NEXT_PUBLIC_ env vars
function getBackendUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Verifying your email…");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    const verify = async () => {
      setStatus("loading");
      setMessage("Verifying your email…");

      try {
        const res = await fetch(`${getBackendUrl()}/api/auth/verify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus("error");
          setMessage(body?.error || `Verification failed (${res.status}). Please try again.`);
          return;
        }

        setStatus("success");
        setMessage(body?.message || "Your email has been verified successfully!");

        // Redirect to login after a short delay
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      } catch (e) {
        console.error("Verify email error", e);
        setStatus("error");
        setMessage("Network error verifying your email. Please try again.");
      }
    };

    void verify();
  }, [searchParams, router]);

  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl shadow-slate-900/60 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white mb-3">
          {isSuccess ? "Email verified" : isError ? "Verification problem" : "Verifying…"}
        </h1>
        <p
          className={`text-sm mb-6 ${
            isSuccess ? "text-emerald-300" : isError ? "text-rose-300" : "text-slate-300"
          }`}
        >
          {message}
        </p>
        <button
          type="button"
          onClick={() => router.push(isSuccess ? "/login" : "/signup")}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-5 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 transition-all"
        >
          {isSuccess ? "Go to login" : "Back to sign up"}
        </button>
      </div>
    </div>
  );
}

