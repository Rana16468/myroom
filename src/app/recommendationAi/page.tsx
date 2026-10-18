"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ListingCard, type ApiListing } from "@/components/myroom/listing-card";
import { readRecommendationData, type RecommendationData } from "@/lib/recommendation-store";

const API_URL = "https://find-my-room-ai.onrender.com/api/v1/recommendations";
const PAGE_SIZE = 12;

// The recommendation API returns the normal listing plus an extra "match_score"
type RecommendedListing = ApiListing & { match_score?: string };

type RecommendationResponse = {
  success?: boolean;
  page?: number;
  total_items?: number;
  total_pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  data?: RecommendedListing[];
};

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "The recommendation service could not be reached. Check your connection and try again.";
    }
    if (error.response.status >= 500) {
      return "The recommendation service is temporarily unavailable. Please try again shortly.";
    }
    const message = (error.response.data as { message?: unknown } | undefined)?.message;
    if (typeof message === "string") return message;
  }
  return "Couldn’t load recommendations. Please try again.";
}

const Page = () => {
  // Read the saved recommendation data once. It is NOT a dependency of the request,
  // so clicking a card button on this page (which updates localStorage) won't refetch.
  const [recommendationData, setRecommendationData] = useState<RecommendationData | null>(null);
  const [page, setPage] = useState(1);
  const [rooms, setRooms] = useState<RecommendedListing[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setRecommendationData(readRecommendationData());
  }, []);

  const hasHistory = (recommendationData?.viewed_room_ids.length ?? 0) > 0;

  useEffect(() => {
    // যদি ডাটা না থাকে তাহলে রিকোয়েস্ট পাঠানোর দরকার নেই
    if (!recommendationData || !hasHistory) return;

    const controller = new AbortController();

    const sendDataToServer = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await axios.post<RecommendationResponse>(API_URL, recommendationData, {
          params: { page, limit: PAGE_SIZE },
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          timeout: 60000, // free hosting can take a while to wake up
        });

        const body = response.data;
        setRooms(body?.data ?? []);
        setTotalPages(Math.max(1, body?.total_pages ?? 1));
        setTotalItems(body?.total_items ?? body?.data?.length ?? 0);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(getErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void sendDataToServer();
    return () => controller.abort();
  }, [recommendationData, hasHistory, page, reloadKey]);

  const goToPage = (p: number) => {
    if (p === page || p < 1 || p > totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const initialLoading = recommendationData === null || (loading && rooms.length === 0);

  return (
    <>
      <header className="pt-1 sm:pt-5"></header>
      <section className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="inline-flex items-center gap-2 text-lg font-semibold text-ink sm:text-xl">
              <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">Recommended for you</span>
            </h1>
            <p className="mt-1 text-[13px] leading-snug text-muted sm:text-sm">
              {totalItems > 0
                ? `${totalItems} room${totalItems > 1 ? "s" : ""} picked based on your activity`
                : "Rooms picked based on the rooms you viewed and searched"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              aria-label="All rooms"
              className="inline-flex size-9 items-center justify-center gap-1.5 rounded-full border border-line bg-card text-xs font-semibold text-ink hover:bg-chip sm:w-auto sm:px-3"
            >
              <ArrowLeft className="size-4 sm:size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">All rooms</span>
            </Link>
            {hasHistory ? (
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                disabled={loading}
                className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-card text-muted transition hover:bg-chip hover:text-ink disabled:opacity-60"
                aria-label="Refresh recommendations"
              >
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            ) : null}
          </div>
        </header>

        {/* Error */}
        {error ? (
          <div
            className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber/30 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <p className="text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="min-h-10 shrink-0 rounded-full border border-line px-4 text-sm font-semibold hover:bg-paper"
            >
              Try again
            </button>
          </div>
        ) : null}

        {/* Content */}
        {initialLoading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-2xl border border-line bg-card"
              >
                <div className="aspect-[4/3] w-full bg-chip" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-2/3 rounded bg-chip" />
                  <div className="h-3 w-1/2 rounded bg-chip" />
                  <div className="h-3 w-1/3 rounded bg-chip" />
                </div>
              </div>
            ))}
            <p className="flex items-center justify-center gap-2 py-2 text-sm text-muted sm:col-span-2 xl:col-span-3">
              <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
              Finding the best rooms for you…
            </p>
          </div>
        ) : !hasHistory ? (
          <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-dashed border-line bg-card px-5 py-10 text-center sm:px-6 sm:py-12">
            <Sparkles className="mx-auto size-6 text-muted" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">No recommendations yet</h2>
            <p className="mt-2 text-sm text-muted">
              View, share or call about a few rooms and we’ll suggest rooms you may like.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-deep"
            >
              Browse rooms
            </Link>
          </div>
        ) : rooms.length === 0 && !error ? (
          <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-dashed border-line bg-card px-5 py-10 text-center sm:px-6 sm:py-12">
            <h2 className="text-lg font-semibold">No matching rooms found</h2>
            <p className="mt-2 text-sm text-muted">Check back soon, new rooms are added often.</p>
          </div>
        ) : (
          <div
            className={`mt-5 grid min-w-0 grid-cols-1 gap-5 transition-opacity sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 ${
              loading ? "opacity-60" : ""
            }`}
          >
            {rooms.map((room) => (
              <div key={room.id} className="flex min-w-0 flex-col gap-2">
                {room.match_score ? (
                  <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary sm:px-3 sm:text-xs">
                    <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{room.match_score}</span>
                  </span>
                ) : null}
                <ListingCard listing={room} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {hasHistory && totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              aria-label="Previous page"
              className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-chip disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* Mobile: simple "Page x of y" */}
            <span className="px-3 text-sm font-medium text-ink sm:hidden">
              Page {page} of {totalPages}
            </span>

            {/* Desktop: numbered pages */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-muted">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    disabled={loading}
                    aria-current={p === page ? "page" : undefined}
                    onClick={() => goToPage(p)}
                    className={`inline-flex size-10 items-center justify-center rounded-full text-sm font-medium ${
                      p === page
                        ? "bg-ink text-on-primary"
                        : "border border-line bg-card text-ink hover:bg-chip"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => goToPage(page + 1)}
              aria-label="Next page"
              className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-chip disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </nav>
        ) : null}
      </section>
    </>
  );
};

export default Page;
