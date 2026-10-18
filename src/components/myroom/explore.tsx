"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { LISTING_TYPES } from "@/data/rooms";
import {
  ListingCard,
  ListingGridSkeleton,
  type ApiListing,
} from "@/components/myroom/listing-card";
import locationData from "@/utility/locations.json";
import { useGetAllRoomListQuery } from "../redux/features/roomListApi";
import { useSearchParams } from "next/navigation";
import {
  detectAndStoreUserCity,
  setSearchKeywords,
  setSearchLocation,
  setSearchType,
  useRecommendationData,
} from "@/lib/recommendation-store";
import Link from "next/link";

const PAGE_SIZE = 12;
const SUGGESTION_LIMIT = 8;

function normalizeLocationQuery(value: string) {
  return value.toLowerCase().replace(/[>›]/g, " ").replace(/\s+/g, " ").trim();
}

function getLocationSuggestions(query: string) {
  const normalizedQuery = normalizeLocationQuery(query);
  if (normalizedQuery.length < 2) return [];

  return locationData.entries
    .filter((entry) => {
      const label = normalizeLocationQuery(entry.label);
      const name = normalizeLocationQuery(entry.name);
      const segments = normalizeLocationQuery(
        entry.segments.map((segment) => segment.name).join(" "),
      );
      return (
        label.includes(normalizedQuery) ||
        name.includes(normalizedQuery) ||
        segments.includes(normalizedQuery)
      );
    })
    .sort(
      (first, second) => second.weight - first.weight || first.label.localeCompare(second.label),
    )
    .slice(0, SUGGESTION_LIMIT);
}

// Location-looking input -> search_location, anything else -> keywords
function trackSearchActivity(rawQuery: string, rawType: string) {
  const text = rawQuery.trim();
  if (text) {
    const [bestMatch] = getLocationSuggestions(text);
    if (bestMatch) {
      setSearchLocation(bestMatch.name);
    } else {
      setSearchKeywords(text.toLowerCase().split(/\s+/));
    }
  }
  if (rawType) setSearchType(rawType);
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function getRoomLoadErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Couldn’t load rooms. Please try again.";
  }

  const apiError = error as {
    status?: number | string;
    data?: { message?: unknown };
  };
  if (apiError.status === "FETCH_ERROR") {
    return "The listings service could not be reached. Check your connection and try again.";
  }
  if (typeof apiError.status === "number" && apiError.status >= 500) {
    return "The listings service is temporarily unavailable. Please try again shortly.";
  }
  if (typeof apiError.data?.message === "string") return apiError.data.message;
  return "Couldn’t load rooms. Please try again.";
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function ExploreContent() {
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [selectedType, setSelectedType] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [mobileList, setMobileList] = useState<ApiListing[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Recommendation tracking: live data from localStorage + one-time city detection
  const recommendation = useRecommendationData();
  const hasViewedRooms = recommendation.viewed_room_ids.length > 0;

  useEffect(() => {
    void detectAndStoreUserCity();
  }, []);

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (searchQuery) p.search = searchQuery;
    if (type) p.types = type;
    return p;
  }, [page, searchQuery, type]);

  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");

  const queryArgs = {
    ...params,
    ...(roomId ? { id: roomId } : {}),
  };

  const { currentData, isLoading, isFetching, error, refetch } = useGetAllRoomListQuery(queryArgs);
  const pageItems: ApiListing[] = currentData?.data?.data ?? [];
  const meta = currentData?.data?.meta;
  const totalPages: number = meta?.totalPages ?? 1;

  // filters / device changed -> start again from page 1
  useEffect(() => {
    setPage(1);
    setMobileList([]);
  }, [searchQuery, type, isDesktop]);

  // mobile: keep appending each page that arrives
  useEffect(() => {
    if (!currentData) return;
    const items: ApiListing[] = currentData.data?.data ?? [];
    const loadedPage: number = currentData.data?.meta?.page ?? 1;
    setMobileList((prev) => {
      const base = loadedPage === 1 ? [] : prev;
      const ids = new Set(base.map((r) => r.id));
      return [...base, ...items.filter((r) => !ids.has(r.id))];
    });
  }, [currentData]);

  // mobile: auto-load next page when the bottom is reached
  const hasMore = page < totalPages;
  useEffect(() => {
    const el = sentinelRef.current;
    if (isDesktop || !el || !hasMore || isFetching || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setPage((p) => p + 1);
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isDesktop, hasMore, isFetching, error, mobileList.length]);

  const rooms = isDesktop ? pageItems : mobileList;
  const suggestions = useMemo(() => getLocationSuggestions(query), [query]);

  useEffect(() => {
    if (activeSuggestion >= suggestions.length) setActiveSuggestion(0);
  }, [activeSuggestion, suggestions.length]);

  const selectSuggestion = (name: string) => {
    setQuery(name);
    setSearchQuery(name);
    setType(selectedType);
    setSuggestionsOpen(false);
    setActiveSuggestion(0);
    trackSearchActivity(name, selectedType);
  };

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("room");
    if (!id) return;
    setHighlight(id);
    document.getElementById(`room-${id}`)?.scrollIntoView({ block: "center" });
  }, [rooms.length]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const title = type ? `${type} rooms` : "Find your room";
  const initialLoading = isLoading || (isFetching && rooms.length === 0);
  const submitFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(query.trim());
    setType(selectedType);
    setSuggestionsOpen(false);
    trackSearchActivity(query, selectedType);
  };
  const clearFilters = () => {
    setQuery("");
    setSearchQuery("");
    setSuggestionsOpen(false);
    setActiveSuggestion(0);
    setSelectedType("");
    setType("");
  };

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="sr-only">{title}</h1>
      <header className="pt-1 sm:pt-5">
        <form
          onSubmit={submitFilters}
          className="rounded-2xl border border-line bg-card p-3 shadow-card sm:p-4"
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="relative block">
              <span className="sr-only">Search rooms by location or keyword</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
              <input
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={suggestionsOpen && suggestions.length > 0}
                aria-controls="location-suggestions"
                aria-activedescendant={
                  suggestionsOpen && suggestions[activeSuggestion]
                    ? `location-suggestion-${suggestions[activeSuggestion].id}`
                    : undefined
                }
                value={query}
                onFocus={() => setSuggestionsOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSuggestionsOpen(true);
                  setActiveSuggestion(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && suggestions.length > 0) {
                    event.preventDefault();
                    setSuggestionsOpen(true);
                    setActiveSuggestion((index) => (index + 1) % suggestions.length);
                  } else if (event.key === "ArrowUp" && suggestions.length > 0) {
                    event.preventDefault();
                    setSuggestionsOpen(true);
                    setActiveSuggestion(
                      (index) => (index - 1 + suggestions.length) % suggestions.length,
                    );
                  } else if (
                    event.key === "Enter" &&
                    suggestionsOpen &&
                    suggestions[activeSuggestion]
                  ) {
                    event.preventDefault();
                    selectSuggestion(suggestions[activeSuggestion].name);
                  } else if (event.key === "Escape") {
                    setSuggestionsOpen(false);
                  }
                }}
                placeholder="Search city, neighborhood, or keyword"
                className="h-11 w-full rounded-xl border border-line bg-card pl-9 pr-10 text-sm text-ink outline-none transition placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search text"
                  className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-chip"
                  onClick={() => {
                    setQuery("");
                    setSuggestionsOpen(false);
                    setActiveSuggestion(0);
                  }}
                >
                  <X className="size-4" />
                </button>
              ) : null}
              {suggestionsOpen && suggestions.length > 0 ? (
                <div
                  id="location-suggestions"
                  role="listbox"
                  aria-label="Location suggestions"
                  className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-card p-1 shadow-card"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      id={`location-suggestion-${suggestion.id}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeSuggestion}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSuggestion(index)}
                      onClick={() => selectSuggestion(suggestion.name)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                        index === activeSuggestion
                          ? "bg-primary/10 text-primary"
                          : "text-ink hover:bg-chip"
                      }`}
                    >
                      <span className="block font-medium">{suggestion.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {suggestion.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <label className="relative block">
              <span className="sr-only">Room type</span>
              <select
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(event.target.value);
                  setSearchType(event.target.value); // ignored when empty
                }}
                className="h-11 w-full appearance-none rounded-xl border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Types</option>
                {LISTING_TYPES.map((roomType) => (
                  <option key={roomType} value={roomType}>
                    {roomType}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-deep"
            >
              <Search className="size-4" aria-hidden="true" />
              Search
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
            {hasViewedRooms ? (
              <span>
                <Link
                  href="/recommendationAi"
                  className="inline-flex min-h-8 items-center font-semibold text-primary hover:underline"
                >
                  Recommendation AI
                </Link>
              </span>
            ) : (
              <span></span>
            )}
            <div className="flex items-center gap-3">
              {searchQuery || type || query || selectedType ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-8 items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  Clear filters
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-card text-muted transition hover:bg-chip hover:text-ink disabled:opacity-60"
                aria-label="Refresh room listings"
              >
                <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </form>
      </header>

      {error ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber/30 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted" role="alert">
            {getRoomLoadErrorMessage(error)}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-10 shrink-0 rounded-full border border-line px-4 text-sm font-semibold hover:bg-paper"
          >
            Try again
          </button>
        </div>
      ) : null}

      {initialLoading ? (
        <div
          className="mt-5 grid min-w-0 grid-cols-1 gap-5 sm:mt-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
          aria-busy="true"
          aria-label="Loading room listings"
        >
          <ListingGridSkeleton count={isDesktop ? 6 : 3} />
        </div>
      ) : rooms.length === 0 && !error ? (
        <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-dashed border-line bg-card px-6 py-12 text-center">
          <Search className="mx-auto size-6 text-muted" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No rooms match your search</h2>
          <p className="mt-2 text-sm text-muted">Try a different location or room type.</p>
          {query || searchQuery || selectedType || type ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-deep"
            >
              Clear all filters
            </button>
          ) : null}
        </div>
      ) : (
        <div
          className={`mt-5 grid min-w-0 grid-cols-1 gap-5 transition-opacity sm:mt-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 ${
            isFetching && isDesktop ? "opacity-60" : ""
          }`}
        >
          {rooms.map((room) => (
            <ListingCard key={room.id} listing={room} highlighted={highlight === room.id} />
          ))}
          {/* Mobile: skeleton cards while the next page loads */}
          {!isDesktop && isFetching && page > 1 ? <ListingGridSkeleton count={2} /> : null}
        </div>
      )}

      {/* Desktop: page buttons */}
      {isDesktop && totalPages > 1 ? (
        <nav
          className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
          aria-label="Pagination"
        >
          <button
            type="button"
            disabled={page <= 1 || isFetching}
            onClick={() => goToPage(page - 1)}
            aria-label="Previous page"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-chip disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={isFetching}
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

          <button
            type="button"
            disabled={page >= totalPages || isFetching}
            onClick={() => goToPage(page + 1)}
            aria-label="Next page"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-chip disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </nav>
      ) : null}

      {/* Mobile: infinite scroll sentinel */}
      {!isDesktop ? (
        <div ref={sentinelRef} className="mt-6 min-h-10 text-center" aria-live="polite">
          {!isFetching && !hasMore && rooms.length > 0 ? (
            <p className="text-xs text-muted">You’re all caught up.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// মূল এক্সপোর্ট করা কম্পোনেন্ট যা Suspense দিয়ে মোড়ানো থাকবে
export function ExploreView() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl">
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-5 sm:mt-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            <ListingGridSkeleton count={3} />
          </div>
        </section>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}