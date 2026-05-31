"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ResponseCard, { type ResponseItem } from "@/components/requests/ResponseCard";
import { createClient } from "@/lib/supabase/client";

interface RequestSummary {
  id: string;
  title: string;
  status: string;
  posted_by_name: string;
  responses_count: number;
}

export default function RequestResponsesPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<RequestSummary | null>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [filled, setFilled] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsGuest(!user);

      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/requests/${params.id}/responses${qs}`);

      if (res.status === 401) {
        setError("This link is invalid or has expired.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Could not load responses. Please try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setRequest(data.request);
      setResponses(data.responses ?? []);
      setFilled(data.request?.status === "filled");
      setLoading(false);
    }

    load();
  }, [params.id, token]);

  async function handleMarkHired(responseId: string) {
    const res = await fetch(`/api/requests/${params.id}/mark-filled`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseId, token: token ?? undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to mark as hired");
    }

    setFilled(true);
    setResponses((prev) =>
      prev.map((r) =>
        r.id === responseId ? { ...r, status: "accepted" } : r
      )
    );
    if (request) setRequest({ ...request, status: "filled" });
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to request board
        </Link>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="text-navy animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <Link href="/requests" className="text-sm text-navy underline mt-4 inline-block">
              Return to request board
            </Link>
          </div>
        )}

        {!loading && !error && request && (
          <>
            <header className="mb-8">
              <h1
                className="font-serif text-3xl font-bold text-navy mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Responses to your request
              </h1>
              <p className="text-lg text-muted">&ldquo;{request.title}&rdquo;</p>
              <p className="text-sm text-muted mt-2">
                {responses.length} verified member{responses.length === 1 ? "" : "s"} responded
              </p>
            </header>

            {filled && (
              <div className="mb-6 flex items-center gap-2 bg-trust/10 text-trust border border-trust/20 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle2 size={18} />
                This request is marked as filled.
              </div>
            )}

            {responses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] p-10 text-center text-muted">
                <p className="font-medium text-navy mb-1">No responses yet</p>
                <p className="text-sm">
                  We&apos;ll email you the moment a verified member responds.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((r) => (
                  <ResponseCard
                    key={r.id}
                    response={r}
                    showMarkHired={!filled}
                    onMarkHired={handleMarkHired}
                  />
                ))}
              </div>
            )}

            {isGuest && (
              <div className="mt-10 bg-stone rounded-2xl border border-[#E5E0D5] p-6 text-center">
                <p className="text-sm text-muted mb-4 leading-relaxed">
                  Are you a Freemason? You can also respond to requests from other members — and
                  list your own services.
                </p>
                <Link
                  href="/login"
                  className="inline-flex bg-navy text-gold font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
                >
                  Create a free account →
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
