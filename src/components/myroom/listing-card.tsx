"use client";

import DOMPurify from "dompurify";

import { ChevronLeft, ChevronRight, Flag, MapPin, Phone, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatPhone, initials, normalizeListingType, telHref } from "@/data/rooms";
import { setReportId, showToast } from "@/store/myroom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { enqueueRoomView, type ViewInteraction } from "@/lib/view-count-queue";
import type { PublicRoomListing } from "../redux/features/roomListApi";

export type ApiListing = PublicRoomListing;

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatDate = (iso?: string) => {
  if (!iso) return "Recently listed";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Recently listed"
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatTimeAgo = (iso?: string) => {
  if (!iso) return "Recently listed";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently listed";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays <= 4) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  return formatDate(iso);
};

const CALL_UNAVAILABLE_MESSAGE = "The host’s phone number isn’t available for this room.";

function isCallableBdPhone(value: string | undefined): value is string {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return /^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/.test(digits);
}

export function ListingCard({
  listing,
  highlighted,
}: {
  listing: ApiListing;
  highlighted?: boolean;
}) {
  const dispatch = useAppDispatch();
  const saved = useAppSelector((state) => state.ui.savedIds.includes(listing.id));
  const reported = useAppSelector((state) => state.ui.reportedIds.includes(listing.id));
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const photos = listing.photos ?? [];
  const photo = photos[index] ?? photos[0];
  const crumbs = (listing.area ?? "")
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" › ");
  const plainAddress = stripHtml(listing.address ?? "");
  const plainDescription = stripHtml(listing.description ?? "");
  const ownerName = listing.user?.name || listing.name || "MyRoom member";
  const phoneCandidate = listing.phone?.trim() || listing.user?.phone?.trim();
  const phone = isCallableBdPhone(phoneCandidate) ? phoneCandidate : undefined;
  const typeLabel = normalizeListingType(listing.types) ?? listing.types;

  const recordView = (interaction: ViewInteraction) => {
    void enqueueRoomView(listing.id, interaction).catch((error: unknown) => {
      console.error(`Could not queue the ${interaction} view for room ${listing.id}.`, error);
      dispatch(showToast("This view could not be queued. Please try again."));
    });
  };

  const share = async () => {
    const url = new URL("/", window.location.origin);
    url.searchParams.set("room", listing.id);
    const shareUrl = url.toString();
    const text = `${listing.types} room in ${listing.neighborhood || "Dhaka"}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MyRoom room listing", text, url: shareUrl });
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      dispatch(showToast("Sharing wasn’t available. Copying the room link instead."));
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        copyWithSelection(shareUrl);
      }
      dispatch(showToast("Link copied"));
    } catch {
      dispatch(showToast(`Copy this link: ${shareUrl}`));
    }
  };

  const step = (delta: number) => {
    if (photos.length < 2) return;
    setIndex((current) => (current + delta + photos.length) % photos.length);
  };

  return (
    <article
      id={`room-${listing.id}`}
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-card p-3 shadow-card transition-shadow hover:shadow-pop ${
        highlighted ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-on-primary"
          aria-hidden="true"
        >
          {initials(ownerName) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xs font-semibold leading-tight">{ownerName}</h2>
          <p className="mt-0.5 truncate text-xs text-muted">{formatTimeAgo(listing.createdAt)}</p>
        </div>
        <span className="max-w-28 truncate rounded-full bg-chip px-2.5 py-1 text-xs font-semibold text-primary">
          {typeLabel}
        </span>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-muted">
        <MapPin className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden="true" />
        <span className="line-clamp-2">{plainAddress || crumbs}</span>
      </p>

      {expanded ? (
        <div
          className="mt-2 text-xs leading-relaxed text-ink [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(listing.description) }}
        />
      ) : (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink">{plainDescription}</p>
      )}

      <button
        type="button"
        className="mt-1 self-start text-[11px] font-semibold text-primary"
        onClick={() => {
          if (!expanded) recordView("see-more");
          setExpanded((open) => !open);
        }}
      >
        {expanded ? "See less" : "Read more"}
      </button>

      {/* যদি ছবি থাকে শুধু তখনই দেখাবে, ছবি না থাকলে এই সেকশন रেন্ডার হবে না */}
      {photo ? (
        <div className="relative mt-2 aspect-4/3 overflow-hidden rounded-xl bg-chip">
          <button
            type="button"
            className="group absolute inset-0 block size-full cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`Enlarge room photo ${index + 1} of ${photos.length}`}
            onClick={() => {
              recordView("zoom");
              setImageViewerOpen(true);
            }}
          >
            <img
              src={photo}
              alt={`${listing.neighborhood} room, photo ${index + 1} of ${photos.length}`}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transition-none"
              loading="lazy"
            />
          </button>

          {photos.length > 1 ? (
            <>
              {/* লেফট অ্যারো: শুধুমাত্র তখন দেখাবে যখন বর্তমান ইনডেক্স ০ এর বেশি (অর্থাৎ প্রথম ছবি পার হয়ে অন্য ছবিতে যাওয়া হয়েছে) */}
              {index > 0 ? (
                <button
                  type="button"
                  className="absolute top-1/2 left-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-ink shadow-card z-10"
                  aria-label="Previous photo"
                  onClick={() => step(-1)}
                >
                  <ChevronLeft className="size-4" />
                </button>
              ) : null}

              {/* রাইট অ্যারো: একের অধিক ছবি থাকলে সবসময় দেখাবে */}
              <button
                type="button"
                className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-ink shadow-card z-10"
                aria-label="Next photo"
                onClick={() => step(1)}
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2.5 inline-block rounded-lg bg-chip px-2.5 py-1.5 text-xs text-muted">
        Posted on {formatDate(listing.createdAt)}
      </div>

      {reported ? (
        <p className="mt-2 text-xs font-medium text-amber">You reported this listing.</p>
      ) : null}

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <button
          type="button"
          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-call px-2 text-xs font-semibold text-on-primary transition hover:bg-call-deep"
          onClick={() => {
            recordView("direct-call");
            setCallModalOpen(true);
          }}
        >
          <Phone className="size-3.5 shrink-0" />
          <span className="truncate">Direct Call</span>
        </button>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-2 text-xs font-semibold text-ink hover:bg-chip"
          aria-label="Share listing"
          onClick={() => {
            recordView("share");
            void share();
          }}
        >
          <Share2 className="size-3.5" />
          <span>Share</span>
        </button>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-2 text-xs font-semibold text-ink hover:bg-chip"
          aria-label={reported ? "Report this listing again" : "Report listing"}
          onClick={() => {
            recordView("report");
            dispatch(setReportId(listing.id));
          }}
        >
          <Flag className="size-3.5" />
          <span>Report</span>
        </button>
      </div>

      {callModalOpen ? (
        <CallNumberModal
          phone={phone}
          ownerName={ownerName}
          onClose={() => setCallModalOpen(false)}
        />
      ) : null}
      {imageViewerOpen && photo ? (
        <ImageViewerModal
          photos={photos}
          index={index}
          neighborhood={listing.neighborhood}
          onClose={() => setImageViewerOpen(false)}
          onStep={step}
        />
      ) : null}
    </article>
  );
}

function ImageViewerModal({
  photos,
  index,
  neighborhood,
  onClose,
  onStep,
}: {
  photos: string[];
  index: number;
  neighborhood: string;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (photos.length > 1 && event.key === "ArrowLeft") onStep(-1);
      if (photos.length > 1 && event.key === "ArrowRight") onStep(1);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onStep, photos.length]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 p-3 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-label={`${neighborhood} room photo`}
        aria-modal="true"
        className="relative flex max-h-full w-full max-w-5xl items-center justify-center"
        role="dialog"
      >
        <button
          type="button"
          aria-label="Close enlarged photo"
          className="absolute -top-12 right-0 z-10 inline-flex size-10 items-center justify-center rounded-full bg-card/15 text-on-primary transition hover:bg-card/25"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
        <img
          src={photos[index]}
          alt={`${neighborhood} room, photo ${index + 1} of ${photos.length}`}
          className="max-h-[85dvh] max-w-full rounded-xl object-contain shadow-pop"
        />
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous enlarged photo"
              className="absolute left-2 inline-flex size-11 items-center justify-center rounded-full bg-card/90 text-ink shadow-card sm:left-4"
              onClick={() => onStep(-1)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next enlarged photo"
              className="absolute right-2 inline-flex size-11 items-center justify-center rounded-full bg-card/90 text-ink shadow-card sm:right-4"
              onClick={() => onStep(1)}
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-3 py-1 text-sm text-on-primary">
              {index + 1} / {photos.length}
            </span>
          </>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}

function CallNumberModal({
  phone,
  ownerName,
  onClose,
}: {
  phone?: string;
  ownerName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="call-number-title"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-pop"
        role="dialog"
      >
        <button
          type="button"
          aria-label="Close phone number"
          className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-chip"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
        <div className="flex size-12 items-center justify-center rounded-full bg-call/10 text-call">
          <Phone className="size-5" aria-hidden="true" />
        </div>
        <h2 id="call-number-title" className="mt-4 text-lg font-semibold">
          Contact {ownerName}
        </h2>
        {phone ? (
          <>
            <p className="mt-1 text-sm text-muted">Host’s phone number</p>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">
              {formatPhone(phone)}
            </p>
            <a
              href={telHref(phone)}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-call text-sm font-semibold text-on-primary transition hover:bg-call-deep"
            >
              <Phone className="size-4" />
              Call now
            </a>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted" role="status">
            {CALL_UNAVAILABLE_MESSAGE}
          </p>
        )}
      </section>
    </div>
  );
}

function copyWithSelection(value: string) {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Clipboard copy failed");
}
