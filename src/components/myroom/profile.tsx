"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { initials, LISTING_TYPES } from "@/data/rooms";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { showLogin } from "@/store/myroom";
import { useMyProfileQuery } from "../redux/features/authApi";
import { useDeleteRoomListMutation, useMyRoomListQuery } from "../redux/features/roomListApi";

const PAGE_LIMIT = 12;

type Profile = {
  id: string;
  name: string;
  email: string;
  photo?: string;
  role: string;
  status: string;
  isVerify: boolean;
  createdAt: string;
};

type MyRoom = {
  id: string;
  address: string;
  area: string;
  types: string;
  description: string;
  neighborhood: string;
  photos: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

type Meta = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

/** Shape used by the profile listing card, built from the API response. */
type CardListing = {
  id: string;
  address: string;
  area?: string;
  types?: string;
  description?: string;
  neighborhood?: string;
  photos: string[];
  views: number;
  createdAt?: string;
};

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "recently";

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

const decodeCodePoint = (value: number) =>
  value >= 0 && value <= 0x10ffff && (value < 0xd800 || value > 0xdfff)
    ? String.fromCodePoint(value)
    : " ";

const htmlToPlainText = (value: string) =>
  value
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"')
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_, code: string) => decodeCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => decodeCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();

const fromApi = (room: MyRoom): CardListing => ({
  id: room.id,
  address: htmlToPlainText(room.address),
  area: room.area,
  types: room.types,
  description: htmlToPlainText(room.description),
  neighborhood: htmlToPlainText(room.neighborhood),
  photos: room.photos ?? [],
  views: room.viewCount ?? 0,
  createdAt: room.createdAt,
});

export function ProfileView() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.session.user);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [type, setType] = useState("");

  const { data, isLoading } = useMyProfileQuery({});
  const profile: Profile | undefined = data?.data;

  const {
    data: listData,
    isFetching: listFetching,
    error: listError,
    refetch,
  } = useMyRoomListQuery({
    page,
    limit: PAGE_LIMIT,
    ...(search ? { search } : {}),
    ...(type ? { types: type } : {}),
  });

  const mylist: MyRoom[] = listData?.data?.data ?? [];
  const meta: Meta | undefined = listData?.data?.meta;

  if (!user) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-chip text-primary">
          <UserRound className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Log in to see your account details and room listings in one place.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-on-primary hover:bg-primary-deep"
          onClick={() => dispatch(showLogin())}
        >
          Log in with Google
        </button>
        <Link href="/" className="mt-4 text-sm font-semibold text-primary hover:underline">
          Explore rooms
        </Link>
      </section>
    );
  }

  const listings = mylist.map(fromApi);
  const totalCount = meta?.totalCount ?? 0;

  const name = profile?.name || user.name;
  const email = profile?.email || user.email;

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setType(selectedType);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setSelectedType("");
    setType("");
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-10">
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="inline-flex size-9 items-center justify-center rounded-full hover:bg-chip"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold">Account</h1>
        </div>
      </header>

      {/* সিম্পল প্রোফাইল কার্ড (ইমেজ অনুযায়ী সাজানো) */}
      <section className="overflow-hidden rounded-3xl border border-line bg-card p-4 shadow-card sm:p-5">
        <div className="flex items-center gap-4">
          {profile?.photo ? (
            <img
              src={profile.photo}
              alt={name}
              referrerPolicy="no-referrer"
              className="size-14 shrink-0 rounded-full border border-line object-cover shadow-sm sm:size-16"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-chip text-muted shadow-sm sm:size-16">
              <UserRound className="size-6" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">
              {name}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">
              Email : <span className="text-ink font-medium">{email}</span>
            </p>
          </div>
          {isLoading ? (
            <LoaderCircle className="size-4 animate-spin text-muted" aria-hidden="true" />
          ) : null}
        </div>
      </section>

      <Link
        href="/list"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary hover:bg-primary-deep"
      >
        <Plus className="size-4" aria-hidden="true" />
        List Room
      </Link>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-semibold">My Listings</h2>
        <span className="rounded-md bg-chip px-2 py-0.5 text-[10px] font-medium text-muted">
          {totalCount} Total
        </span>
      </div>

      <form
        onSubmit={submitFilters}
        className="rounded-2xl border border-line bg-card p-3 shadow-card sm:p-4"
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="relative block">
            <span className="sr-only">Search your listings by location or keyword</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search city, neighborhood, or keyword"
              className="h-11 w-full rounded-xl border border-line bg-card pl-9 pr-10 text-sm text-ink outline-none transition placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchInput ? (
              <button
                type="button"
                aria-label="Clear search text"
                className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-chip"
                onClick={() => setSearchInput("")}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </label>
          <label className="relative block">
            <span className="sr-only">Filter your listings by room type</span>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
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
            disabled={listFetching}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-deep disabled:opacity-60"
          >
            <Search className="size-4" aria-hidden="true" />
            Search
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
          <span>
            {listFetching
              ? "Finding listings…"
              : `${totalCount} ${totalCount === 1 ? "listing" : "listings"} found`}
          </span>
          <div className="flex items-center gap-2">
            {search || type || searchInput || selectedType ? (
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
              disabled={listFetching}
              className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-card text-muted transition hover:bg-chip hover:text-ink disabled:opacity-60"
              aria-label="Refresh your listings"
            >
              <RefreshCw className={`size-4 ${listFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </form>

      {listFetching && !mylist.length ? (
        <p className="py-6 text-center text-sm text-muted">Loading listings...</p>
      ) : listError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-500">
          Could not load your listings.
        </p>
      ) : listings.length ? (
        <div
          className={`grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 ${
            listFetching ? "opacity-60" : ""
          }`}
        >
          {listings.map((listing, index) => (
            <ProfileListingCard
              key={listing.id}
              listing={listing}
              ownerName={name}
              editable
              highlighted={index === 0 && page === 1}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-card px-5 py-10 text-center">
          <h3 className="font-semibold">No listings yet</h3>
          <p className="mt-1 text-sm text-muted">When you list a room, it will appear here.</p>
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={meta.page <= 1 || listFetching}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-card px-3 text-[11px] font-semibold hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Prev
          </button>
          <span className="text-[11px] font-medium text-muted">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={meta.page >= meta.totalPages || listFetching}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-card px-3 text-[11px] font-semibold hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-center text-sm font-semibold">Top cities</h2>
      </section>
    </div>
  );
}

function ProfileListingCard({
  listing,
  ownerName,
  editable,
  highlighted,
}: {
  listing: CardListing;
  ownerName: string;
  editable: boolean;
  highlighted?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomListMutation();

  const photos = listing.photos ?? [];
  const photo = photos[index] ?? photos[0];

  const step = (delta: number) => {
    if (photos.length < 2) return;
    setIndex((current) => (current + delta + photos.length) % photos.length);
  };

  const handleDelete = async () => {
    const confirmation = await Swal.fire({
      title: "Delete this listing?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete listing",
      cancelButtonText: "Keep listing",
      confirmButtonColor: "var(--color-amber)",
      reverseButtons: true,
      focusCancel: true,
    });
    if (!confirmation.isConfirmed || isDeleting) return;

    try {
      const result = await deleteRoom(listing.id).unwrap();
      if (!result.success) {
        throw new Error(result.message || "The listing could not be deleted.");
      }
      await Swal.fire({
        title: "Listing deleted",
        text: result.message || "Your listing has been removed.",
        icon: "success",
        confirmButtonText: "Done",
        confirmButtonColor: "var(--color-primary)",
      });
    } catch (error) {
      await Swal.fire({
        title: "Couldn’t delete listing",
        text: getDeleteErrorMessage(error),
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "var(--color-primary)",
      });
    }
  };

  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card p-3 shadow-card ${
        highlighted ? "border-primary/40 ring-2 ring-primary/20" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-on-primary">
          {initials(ownerName) || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{ownerName}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{formatTimeAgo(listing.createdAt)}</p>
        </div>
        {listing.types ? (
          <span className="max-w-28 truncate rounded-full bg-chip px-2.5 py-1 text-xs font-semibold text-primary">
            {listing.types}
          </span>
        ) : null}
      </div>

      {listing.area || listing.address ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-muted">
          <MapPin className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden="true" />
          <span className="line-clamp-2">{listing.address || listing.area}</span>
        </p>
      ) : null}

      {listing.description ? (
        <>
          <p className={`mt-2 text-xs leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
            {listing.description}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-1 self-start text-xs font-semibold text-primary"
          >
            {expanded ? "See less" : "Read more"}
          </button>
        </>
      ) : null}

      {listing.neighborhood ? (
        <p className="mt-1 text-xs text-muted">{listing.neighborhood}</p>
      ) : null}

      <div className="relative mt-2 aspect-4/3 overflow-hidden rounded-xl bg-chip">
        {photo ? (
          <>
            <button
              type="button"
              className="group absolute inset-0 block size-full cursor-zoom-in overflow-hidden"
              aria-label={`Enlarge listing photo ${index + 1} of ${photos.length}`}
              onClick={() => setPhotoViewerOpen(true)}
            >
              <img
                src={photo}
                alt={`${listing.types || "Room"} listing, photo ${index + 1} of ${photos.length}`}
                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transition-none"
                loading="lazy"
              />
            </button>

            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute top-1/2 left-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-ink shadow-card z-10"
                  aria-label="Previous photo"
                  onClick={() => step(-1)}
                >
                  <ChevronLeft className="size-4" />
                </button>
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
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted">
            No photo yet
          </span>
        )}

        <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-md bg-ink/80 px-2 py-1 text-xs font-medium text-on-primary">
          <Eye className="size-3" aria-hidden="true" />
          <span>{listing.views.toLocaleString()} views</span>
          {photos.length > 1 ? (
            <span aria-label={`Photo ${index + 1} of ${photos.length}`}>
              · <ImageIcon className="inline size-3" aria-hidden="true" /> {index + 1}/{photos.length}
            </span>
          ) : null}
        </span>
      </div>

      <div className="mt-2.5 inline-block rounded-lg bg-chip px-2.5 py-1.5 text-xs text-muted">
        Posted on {formatDate(listing.createdAt)}
      </div>

      {photoViewerOpen && photo ? (
        <ProfilePhotoViewer
          src={photo}
          alt={`${listing.types || "Room"} listing`}
          onClose={() => setPhotoViewerOpen(false)}
        />
      ) : null}

      {editable ? (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Link
            href={`/list?edit=${listing.id}`}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-ink hover:bg-chip"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit Listing
          </Link>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-card px-3 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-3.5" aria-hidden="true" />
            )}
            {isDeleting ? "Deleting..." : "Delete Listing"}
          </button>
        </div>
      ) : (
        <Link
          href={`/rooms/${listing.id}`}
          className="mt-2.5 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-line text-xs font-semibold hover:bg-paper"
        >
          View room
        </Link>
      )}
    </article>
  );
}

function ProfilePhotoViewer({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-ink/90 p-3 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-label="Enlarged room photo"
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
          src={src}
          alt={alt}
          className="max-h-[85dvh] max-w-full rounded-xl object-contain shadow-pop"
        />
      </section>
    </div>,
    document.body,
  );
}

function getDeleteErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (!error || typeof error !== "object") return "Please try again in a moment.";

  const apiError = error as {
    status?: number | string;
    data?: { message?: string; error?: string };
    error?: string;
  };

  if (apiError.status === "FETCH_ERROR") {
    return "Could not connect to the server. Check your connection and try again.";
  }
  if (apiError.status === "TIMEOUT_ERROR") {
    return "The request timed out. Please try again.";
  }
  if (apiError.status === "PARSING_ERROR") {
    return "The server returned an unexpected response. Please refresh and check your listings.";
  }
  if (apiError.status === 401) return "Please sign in again before deleting a listing.";
  if (apiError.status === 403) return "You don’t have permission to delete this listing.";
  if (apiError.status === 404) return "This listing was not found or has already been deleted.";
  if (typeof apiError.status === "number" && apiError.status >= 500) {
    return "The server couldn’t delete this listing. Please try again later.";
  }
  return apiError.data?.message ?? apiError.data?.error ?? apiError.error ?? "Please try again.";
}