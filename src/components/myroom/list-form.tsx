"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  ChevronLeft,
  Italic,
  List,
  ListOrdered,
  LoaderCircle,
  Search,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { LISTING_TYPES, type Listing, type ListingType } from "@/data/rooms";
import locationData from "@/utility/locations.json";
import { addListing, showToast, updateListing } from "@/store/myroom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAvaterQuery } from "../redux/features/authApi";
import {
  useCreateListingMutation,
  useSpecificRoomListQuery,
  useUpdateRoomListMutation,
} from "../redux/features/roomListApi";

type Draft = {
  /** Preview data-URLs (same order as `files`) */
  photos: string[];
  /** New uploads aligned with `photos`; null indicates an already-uploaded photo. */
  files: (File | null)[];
  photoIndex: number;
  area: string;
  neighborhood: string;
  locationPath: string;
  /** HTML from the rich text editor */
  address: string;
  /** HTML from the rich text editor */
  description: string;
  type: ListingType | "";
  name: string;
  phone: string;
};

const EMPTY: Draft = {
  photos: [],
  files: [],
  photoIndex: 0,
  area: "",
  neighborhood: "",
  locationPath: "",
  address: "",
  description: "",
  type: "",
  name: "",
  phone: "",
};

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE_MB = 5;

/* -------------------------------------------------------------------------- */
/*                                Main component                              */
/* -------------------------------------------------------------------------- */

export function ListRoomForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.session.user);
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const existingListing = useAppSelector((state) =>
    editId ? state.listings.userListings.find((listing) => listing.id === editId) : undefined,
  );
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editDataError, setEditDataError] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const initializedEditId = useRef<string | null>(null);

  const { data: profileData, error: profileError } = useAvaterQuery({});
  const [createListing, { isLoading: loadingCreateListing, error: errorCreateListing }] =
    useCreateListingMutation();

 

  const {
    data: specificRoomResponse,
    isFetching: loadingSpecificRoom,
    error: specificRoomError,
    refetch: refetchSpecificRoom,
  } = useSpecificRoomListQuery({ id: editId ?? "" }, { skip: !editId });
  const [updateRoomList, { isLoading: loadingUpdateRoom, error: errorUpdateRoom }] =
    useUpdateRoomListMutation();
  const isSubmitting = loadingCreateListing || loadingUpdateRoom;

  useEffect(() => {
    if (!user) return;
    setDraft((current) => ({
      ...current,
      name: current.name || user.name,
      phone: current.phone || user.phone,
    }));
  }, [user]);

  // Refresh account details from the same profile endpoint used on the account page.
  useEffect(() => {
    const profile = profileData?.data;
    if (!profile) return;
    setDraft((current) => ({
      ...current,
      name: profile.name ?? current.name,
      phone: profile.phone ?? current.phone,
    }));
  }, [profileData]);

  useEffect(() => {
    if (!editId || !specificRoomResponse || initializedEditId.current === editId) return;
    const room = specificRoomResponse.data;
    const path = typeof room?.area === "string" ? room.area.trim() : "";
    const segments = path.split(">").map((segment) => segment.trim()).filter(Boolean);
    const type = LISTING_TYPES.find((candidate) => candidate === room?.types) ?? "";

    if (
      specificRoomResponse.success !== true ||
      !room ||
      room.id !== editId ||
      !path ||
      typeof room.address !== "string" ||
      typeof room.description !== "string" ||
      !Array.isArray(room.photos) ||
      !room.photos.every((photo) => typeof photo === "string")
    ) {
      setEditDataError("The room details returned by the server are incomplete. Please retry.");
      return;
    }

    setDraft((current) => ({
      ...EMPTY,
      name: current.name || user?.name || "",
      phone: current.phone || user?.phone || "",
      photos: room.photos,
      files: room.photos.map(() => null),
      area: segments.length > 2 ? segments[2] ?? segments.at(-1) ?? "" : segments.at(-1) ?? "",
      neighborhood: typeof room.neighborhood === "string" ? room.neighborhood : "",
      locationPath: path,
      address: room.address,
      description: room.description,
      type,
    }));
    setLocationSearch(path);
    setEditDataError("");
    setErrors(
      !type
        ? { types: `The listing type "${room.types}" is not available. Choose a valid type before saving.` }
        : {},
    );
    initializedEditId.current = editId;
  }, [editId, specificRoomResponse, user]);

  const photo = draft.photos[draft.photoIndex];
  const normalizedLocationSearch = normalizeLocationQuery(locationSearch);
  const locationResults =
    normalizedLocationSearch.length >= 2
      ? locationData.entries
          .filter((entry) => {
            const label = normalizeLocationQuery(entry.label);
            const name = normalizeLocationQuery(entry.name);
            const segments = normalizeLocationQuery(
              entry.segments.map((segment) => segment.name).join(" "),
            );
            return (
              label.includes(normalizedLocationSearch) ||
              name.includes(normalizedLocationSearch) ||
              segments.includes(normalizedLocationSearch)
            );
          })
          .sort(
            (first, second) =>
              second.weight - first.weight || first.label.localeCompare(second.label),
          )
          .slice(0, 8)
      : [];

  const selectLocation = (location: (typeof locationData.entries)[number]) => {
    const leaf = location.segments.at(-1);
    const area = location.segments.find((segment) => segment.level === "area") ?? leaf;
    if (!leaf || !area) return;

    setDraft((current) => ({
      ...current,
      area: area.name,
      neighborhood: leaf.name,
      locationPath: location.label,
    }));
    setLocationSearch(location.label);
    setLocationOpen(false);
    setActiveLocationIndex(0);
    setErrors((current) => {
      const next = { ...current };
      delete next.area;
      return next;
    });
  };

  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    const addedPreviews: string[] = [];
    const addedFiles: File[] = [];

    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/")) {
        dispatch(showToast(`${file.name} is not an image`));
        continue;
      }
      if (draft.photos.length + addedPreviews.length >= MAX_PHOTOS) {
        dispatch(showToast(`You can upload up to ${MAX_PHOTOS} photos`));
        break;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        dispatch(showToast(`${file.name} is larger than ${MAX_FILE_SIZE_MB}MB`));
        continue;
      }
      try {
        addedPreviews.push(await readImage(file));
        addedFiles.push(file);
      } catch {
        dispatch(showToast(`Could not read ${file.name}`));
      }
    }
    if (addedFiles.length === 0) return;

    setDraft((current) => ({
      ...current,
      photos: [...current.photos, ...addedPreviews].slice(0, MAX_PHOTOS),
      files: [...current.files, ...addedFiles].slice(0, MAX_PHOTOS),
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const next = validate(draft);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    const payload = {
      address: draft.address,
      area: draft.locationPath,
      types: draft.type,
      description: draft.description,
      neighborhood: draft.neighborhood,
    };

    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));
    draft.files.forEach((file) => {
      if (file) formData.append("photos", file);
    });

    try {
      if (editId) {
        const res = await updateRoomList({ id: editId, data: formData }).unwrap();
        if (!res.success || !res.data?.id) {
          throw new Error(res.message || "The server couldn’t save these changes.");
        }
        const room = res.data;
        const updatedType =
          LISTING_TYPES.find((type) => type === room.types) ??
          (draft.type || undefined);
        if (!updatedType) {
          throw new Error("Choose a supported room type before saving.");
        }
        const updatedListing: Listing = {
          id: room.id,
          name: existingListing?.name ?? draft.name.trim(),
          description: room.description,
          photos: room.photos.length ? room.photos : draft.photos.filter((photo) => !photo.startsWith("data:")),
          area: room.area,
          locationPath: room.area,
          neighborhood: room.neighborhood,
          address: room.address,
          types: updatedType,
          phone: existingListing?.phone ?? draft.phone,
          ...(existingListing?.rent !== undefined ? { rent: existingListing.rent } : {}),
          ...(existingListing?.availableLabel ? { availableLabel: existingListing.availableLabel } : {}),
          ...(existingListing?.availableISO ? { availableISO: existingListing.availableISO } : {}),
        };
        dispatch(updateListing(updatedListing));
        dispatch(showToast(res.message || "Your room has been updated"));
        router.push(`/?room=${encodeURIComponent(room.id)}`);
        return;
      }

      const res = await createListing(formData).unwrap();
      if (!res?.success || !res.data?.id) {
        throw new Error(res?.message || "The server couldn’t create this listing.");
      }

      const listing: Listing = {
        id: res.data.id,
        name: draft.name.trim(),
        description: res.data.description,
        photos: res.data.photos?.length ? res.data.photos : draft.photos,
        area: res.data.area,
        neighborhood: res.data.neighborhood,
        address: res.data.address,
        types: res.data.types as ListingType,
        phone: draft.phone,
      };

      dispatch(addListing(listing));
      dispatch(showToast(res.message || "Your room is listed"));
      router.push(`/?room=${encodeURIComponent(listing.id)}`);
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err)));
    }
  };

  if (
    editId &&
    (loadingSpecificRoom ||
      (!specificRoomError &&
        !editDataError &&
        (!specificRoomResponse || initializedEditId.current !== editId)))
  ) {
    return (
      <div className="mx-auto flex max-w-lg items-center justify-center gap-3 rounded-3xl bg-card px-6 py-12 text-sm text-muted shadow-card">
        <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
        Loading room details…
      </div>
    );
  }

  if (editId && (specificRoomError || editDataError || !specificRoomResponse)) {
    const message = editDataError || (specificRoomError
      ? getApiErrorMessage(specificRoomError)
      : "The room could not be found. Please check the link and retry.");
    return (
      <section className="mx-auto max-w-lg rounded-3xl border border-line bg-card p-6 shadow-card" role="alert">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-amber/10 text-amber">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Couldn’t load this room</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {specificRoomError || editDataError ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-deep"
              onClick={() => void refetchSpecificRoom()}
            >
              Try again
            </button>
          ) : null}
          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold hover:bg-paper"
          >
            Back to profile
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg lg:mt-6" noValidate>
      <div className="rounded-3xl bg-card px-4 py-5 shadow-card sm:px-6 lg:border lg:border-line">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Link
            href="/"
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-chip"
            aria-label="Back to rooms"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {editId ? "Update your room" : "List a room"}
            </h1>
            <p className="text-sm text-muted">
              {editId ? "Review your room details and save your changes." : "Reach housemates across the country."}
            </p>
          </div>
        </div>

        {/* Photos */}
        <p className="label mt-5 uppercase">Upload room picture</p>
        <div className="relative mt-2 aspect-[3/2] overflow-hidden rounded-xl bg-chip">
          {photo ? (
            <img src={photo} alt="Room preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted">
              <Camera className="size-5" />
              Add up to {MAX_PHOTOS} photos
            </div>
          )}
          {draft.photos.length > 0 ? (
            <>
              {draft.files[draft.photoIndex] ? (
                <button
                  type="button"
                  className="absolute top-2 right-2 rounded-sm bg-primary px-2 py-1 text-xs font-semibold text-on-primary"
                  aria-label="Remove selected new photo"
                  onClick={() =>
                    setDraft((current) => {
                      const photos = current.photos.filter(
                        (_, index) => index !== current.photoIndex,
                      );
                      const files = current.files.filter((_, index) => index !== current.photoIndex);
                      return {
                        ...current,
                        photos,
                        files,
                        photoIndex: Math.max(0, Math.min(current.photoIndex, photos.length - 1)),
                      };
                    })
                  }
                >
                  Remove photo
                </button>
              ) : editId ? (
                <span className="absolute top-2 right-2 rounded-md bg-ink/80 px-2 py-1 text-xs font-medium text-on-primary">
                  Current photo
                </span>
              ) : null}
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-sm bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-on-primary">
                <Camera className="size-3" />
                {draft.photoIndex + 1}/{MAX_PHOTOS}
              </span>
            </>
          ) : null}
        </div>

        {draft.photos.length > 1 ? (
          <div className="mt-2 flex gap-2">
            {draft.photos.map((src, index) => (
              <button
                key={src.slice(0, 48) + index}
                type="button"
                className={`size-12 overflow-hidden rounded-lg border ${
                  index === draft.photoIndex ? "border-primary" : "border-line"
                }`}
                onClick={() => setDraft((current) => ({ ...current, photoIndex: index }))}
                aria-label={`Show photo ${index + 1}`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex justify-center">
          <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-5 text-xs font-semibold text-on-primary hover:bg-primary-deep">
            {editId ? "Add photos (optional)" : "Upload photo (optional)"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                void onFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        <hr className="mt-4 border-line" />

        {/* Location area */}
        <Field label="Location area" error={errors.area} required className="mt-4" as="div">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              role="combobox"
              aria-label="Search location"
              aria-autocomplete="list"
              aria-expanded={locationOpen}
              aria-controls="location-search-results"
              aria-activedescendant={
                locationOpen && locationResults[activeLocationIndex]
                  ? `location-result-${locationResults[activeLocationIndex].id}`
                  : undefined
              }
              autoComplete="off"
              placeholder="Search division, district, area, or neighborhood"
              value={locationSearch}
              onFocus={() => setLocationOpen(true)}
              onBlur={() => setLocationOpen(false)}
              onChange={(event) => {
                const value = event.target.value;
                setLocationSearch(value);
                setLocationOpen(true);
                setActiveLocationIndex(0);
                setDraft((current) => ({
                  ...current,
                  area: "",
                  neighborhood: "",
                  locationPath: "",
                }));
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && locationResults.length > 0) {
                  event.preventDefault();
                  setLocationOpen(true);
                  setActiveLocationIndex((current) => (current + 1) % locationResults.length);
                } else if (event.key === "ArrowUp" && locationResults.length > 0) {
                  event.preventDefault();
                  setActiveLocationIndex(
                    (current) => (current - 1 + locationResults.length) % locationResults.length,
                  );
                } else if (event.key === "Enter" && locationOpen) {
                  event.preventDefault();
                  const activeLocation = locationResults[activeLocationIndex];
                  if (activeLocation) selectLocation(activeLocation);
                } else if (event.key === "Escape") {
                  setLocationOpen(false);
                }
              }}
              className={`field pl-10 ${errors.area ? "border-amber" : ""}`}
            />
          </div>

          {locationOpen && normalizedLocationSearch.length >= 2 ? (
            <div
              id="location-search-results"
              role="listbox"
              aria-label="Location results"
              className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-line bg-card p-1 shadow-card"
            >
              {locationResults.length > 0 ? (
                locationResults.map((location, index) => (
                  <button
                    key={location.id}
                    id={`location-result-${location.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeLocationIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveLocationIndex(index)}
                    onClick={() => selectLocation(location)}
                    className={`w-full rounded-md px-3 py-2 text-left text-xs ${
                      index === activeLocationIndex
                        ? "bg-chip text-ink"
                        : "text-muted hover:bg-chip"
                    }`}
                  >
                    {location.label}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-muted">No matching locations found.</p>
              )}
            </div>
          ) : null}
          {draft.locationPath ? (
            <p className="mt-2 text-xs text-muted" aria-live="polite">
              Selected: <span className="font-medium text-ink">{draft.locationPath}</span>
            </p>
          ) : null}
        </Field>

        {/* Address (rich text) */}
        <Field label="Address details" error={errors.address} required className="mt-4" as="div">
          <RichTextEditor
            ariaLabel="Address details"
            placeholder="House, road, area..."
            minHeight="min-h-20"
            invalid={Boolean(errors.address)}
            value={draft.address}
            onChange={(html) => setDraft((current) => ({ ...current, address: html }))}
          />
        </Field>

        {/* Description (rich text) */}
        <Field
          label="Describe your room facilities"
          error={errors.description}
          required
          className="mt-4"
          as="div"
        >
          <RichTextEditor
            ariaLabel="Describe your room facilities"
            placeholder="Describe your room, rent, and location..."
            minHeight="min-h-36"
            invalid={Boolean(errors.description)}
            value={draft.description}
            onChange={(html) => setDraft((current) => ({ ...current, description: html }))}
          />
        </Field>

        {/* Listing type (single-select dropdown) */}
        <Field label="Choose listing type" error={errors.types} required className="mt-4" as="div">
          <SingleSelectDropdown
            ariaLabel="Choose listing type"
            placeholder="Select listing type"
            options={LISTING_TYPES}
            selected={draft.type}
            invalid={Boolean(errors.types)}
            onSelect={(type) => {
              setDraft((current) => ({ ...current, type }));
              setErrors((current) => {
                const next = { ...current };
                delete next.types;
                return next;
              });
            }}
          />
        </Field>

        {/* Personal info + submit */}
        <section className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold">Personal Info</h2>

          <Field label="Name" error={errors.name} required className="mt-3">
            <input className="field bg-chip" value={profileData?.data?.name} readOnly />
          </Field>

          <Field

            label="Contact number for inquiries"
            error={errors.phone}
            required
            className="mt-3"
          >
            <input
              className="field bg-chip"
              inputMode="numeric"
              placeholder="01XXXXXXXXX"
              value={profileData?.data?.phone}
              readOnly
            />
          </Field>

          <p className="mt-4 rounded-xl bg-primary/10 px-3 py-3 text-xs leading-relaxed text-muted">
            By posting, you agree to Myroom’s{" "}
            <Link href="/safety" className="font-semibold text-primary">
              Safety Guidelines
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-primary">
              Terms of Service
            </Link>
            . Your listing will be reviewed before going live.
          </p>

          {profileError ? (
            <p className="mt-3 text-sm text-muted" role="status">
              Couldn’t refresh your account details. The saved name and phone number are still available.
            </p>
          ) : null}
          {editId && editDataError ? (
            <p className="mt-3 text-sm font-medium text-amber" role="alert">
              {editDataError}
            </p>
          ) : null}
          {(editId ? errorUpdateRoom : errorCreateListing) ? (
            <p className="mt-3 text-sm font-medium text-amber" role="alert">
              {getApiErrorMessage(editId ? errorUpdateRoom : errorCreateListing)}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || Boolean(editId && !specificRoomResponse)}
            className="mt-4 h-11 w-full rounded-lg bg-primary text-xs font-bold tracking-wide text-on-primary uppercase hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? editId ? "Saving changes..." : "Listing..."
              : editId ? "Save changes" : "List your room"}
          </button>
        </section>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                        Single-select dropdown (type)                       */
/* -------------------------------------------------------------------------- */

function SingleSelectDropdown<T extends string>({
  options,
  selected,
  onSelect,
  placeholder,
  invalid,
  ariaLabel,
}: {
  options: readonly T[];
  selected: T | "";
  onSelect: (option: T) => void;
  placeholder: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left text-xs ${
          invalid ? "border-amber" : open ? "border-primary" : "border-line"
        }`}
      >
        {selected ? (
          <span className="font-medium text-ink">{selected}</span>
        ) : (
          <span className="text-faint">{placeholder}</span>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-card p-1 shadow-card"
        >
          {options.map((option) => {
            const isSelected = selected === option;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-chip ${
                  isSelected ? "bg-primary/10 font-semibold text-primary" : "text-ink"
                }`}
              >
                {option}
                {isSelected ? <Check className="size-3.5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                   Rich text editor (simple: B / I / lists)                 */
/* -------------------------------------------------------------------------- */

function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "min-h-24",
  invalid,
  ariaLabel,
}: {
  /** HTML string. Empty string means "no content". */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false,
      }),
    ],
    content: value,
    immediatelyRender: false, // avoids SSR hydration mismatch in Next.js
    shouldRerenderOnTransaction: true, // keeps toolbar active-states in sync
    editorProps: {
      attributes: {
        "aria-label": ariaLabel ?? "Rich text editor",
        role: "textbox",
        "aria-multiline": "true",
        class: [
          minHeight,
          "px-3 py-2.5 text-sm outline-none",
          "[&_p]:my-0",
          "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
        ].join(" "),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? "" : instance.getHTML());
    },
  });

  // Keep the editor in sync if the parent resets / replaces the value.
  useEffect(() => {
    if (!editor) return;
    if (value === "" && editor.isEmpty) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-card focus-within:border-primary ${
        invalid ? "border-amber" : "border-line"
      }`}
    >
      {editor ? (
        <Toolbar editor={editor} />
      ) : (
        <div className="h-10 border-b border-line bg-chip/60" />
      )}

      <div className="relative">
        {editor?.isEmpty && placeholder ? (
          <span
            className="pointer-events-none absolute top-2.5 left-3 text-sm text-faint"
            aria-hidden="true"
          >
            {placeholder}
          </span>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div
      className="flex items-center gap-0.5 border-b border-line bg-chip/60 px-1.5 py-1"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolButton
        label="Bold"
        icon={Bold}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolButton
        label="Italic"
        icon={Italic}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />

      <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

      <ToolButton
        label="Bulleted list"
        icon={List}
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolButton
        label="Numbered list"
        icon={ListOrdered}
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // keep focus (and the selection) inside the editor
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-primary/10 text-primary" : ""
      }`}
    >
      <Icon className="size-4" />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  error,
  required,
  className,
  as = "label",
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Use "div" when the field contains buttons / editors (a <label> would hijack clicks). */
  as?: "label" | "div";
  children: React.ReactNode;
}) {
  const Wrapper = as;
  return (
    <Wrapper className={`block ${className ?? ""}`}>
      <span className="label uppercase">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      <div className="mt-2">{children}</div>
      {error ? <span className="mt-1 block text-sm font-medium text-amber">{error}</span> : null}
    </Wrapper>
  );
}

/** Lowercase, remove breadcrumb separators and collapse whitespace for location search. */
function normalizeLocationQuery(value: string) {
  return value.toLowerCase().replace(/[>›]/g, " ").replace(/\s+/g, " ").trim();
}

/** Strip HTML tags so validation counts real characters, not markup. */
function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validate(draft: Draft) {
  const errors: Record<string, string> = {};
  if (!draft.locationPath || !draft.area || !draft.neighborhood) {
    errors.area = "Choose a location from the search results.";
  }
  if (plainText(draft.address).length < 8) errors.address = "Add a house, road, or area.";
  if (plainText(draft.description).length < 20)
    errors.description = "Describe the room in a sentence or two.";
  if (!draft.type) errors.types = "Pick at least one listing type.";
  if (draft.name.trim().length < 2) errors.name = "Add the name guests should see.";
  if (!/^01\d{9}$/.test(draft.phone)) errors.phone = "Use an 11-digit BD mobile number.";
  return errors;
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Turn any RTK Query / fetch error into a short, user-friendly message. */
function getApiErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;

  const e = err as {
    status?: number | string;
    data?: { message?: string; error?: string };
    error?: string;
  };

  if (e?.status === "FETCH_ERROR") return "Network error. Check your connection and try again.";
  if (e?.status === "PARSING_ERROR") return "Unexpected response from the server.";
  if (e?.status === "TIMEOUT_ERROR") return "The request timed out. Please try again.";
  if (e?.status === 401) return "Please sign in again to list a room.";
  if (e?.status === 403) return "You don't have permission to do this.";
  if (e?.status === 404) return "This room was not found or is no longer available.";
  if (e?.status === 413) return "Photos are too large. Try smaller images.";
  if (e?.status === 422 || e?.status === 400) return e?.data?.message ?? "Some fields are invalid.";
  if (typeof e?.status === "number" && e.status >= 500)
    return "Server error. Please try again later.";

  return e?.data?.message ?? e?.data?.error ?? e?.error ?? "Something went wrong.";
}
