"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

type State = "loading" | "success" | "error";

export default function ConfirmRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-1 bg-stone flex items-center justify-center px-4 py-16">
            <Loader2 size={36} className="animate-spin text-navy" />
          </div>
          <Footer />
        </div>
      }
    >
      <ConfirmRequestInner />
    </Suspense>
  );
}

function ConfirmRequestInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setState("error");
      setErrorMsg("This confirmation link is missing its token.");
      return;
    }

    fetch("/api/requests/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setState("success");
        } else {
          setState("error");
          setErrorMsg(data.error || "We couldn't confirm your request.");
        }
      })
      .catch(() => {
        setState("error");
        setErrorMsg("Network error. Please try again.");
      });
  }, [token]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 bg-stone flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          {state === "loading" && (
            <>
              <Loader2 size={36} className="animate-spin text-navy mx-auto mb-4" />
              <h1 className="font-serif text-2xl font-bold text-navy mb-1">Confirming your request…</h1>
              <p className="text-sm text-muted">One moment.</p>
            </>
          )}

          {state === "success" && (
            <>
              <CheckCircle2 size={40} className="text-trust mx-auto mb-4" />
              <h1 className="font-serif text-2xl font-bold text-navy mb-2">Your request is live</h1>
              <p className="text-sm text-muted mb-6">
                Verified Masonic professionals in your area can now see it and respond. We&apos;ll
                email you the moment someone does.
              </p>
              <Link
                href="/requests"
                className="inline-block bg-gold hover:bg-gold-dark text-navy font-bold px-5 py-3 rounded-xl transition-colors text-sm"
              >
                Browse the request board →
              </Link>
            </>
          )}

          {state === "error" && (
            <>
              <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
              <h1 className="font-serif text-2xl font-bold text-navy mb-2">Confirmation failed</h1>
              <p className="text-sm text-muted mb-6">{errorMsg}</p>
              <Link
                href="/requests"
                className="inline-block text-sm font-semibold text-navy border border-navy/20 px-4 py-2.5 rounded-lg hover:bg-stone transition-colors"
              >
                Go to the request board
              </Link>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
