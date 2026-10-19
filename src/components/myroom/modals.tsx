"use client";

import * as Slider from "@radix-ui/react-slider";
import { Calendar, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatPhone, formatRent, RENT_MAX, RENT_MIN, telHref, type Listing } from "@/data/rooms";
import { BdFlag } from "@/components/myroom/icons";
import {
  applyRentAndDate,
  authenticateUser,
  closeAccount,
  reportListing,
  setCallId,
  setDraftPhone,
  setFilterOpen,
  setReportId,
  showToast,
} from "@/store/myroom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import ErrorPage from "@/ErrorPage/ErrorPage";

import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import Bowser from "bowser";
import { useCreateAccountMutation } from "../redux/features/authApi";
import { useRecoredReportMutation } from "../redux/features/reportApi";
import { TOKEN_NAME, tokenRecorded } from "@/utility/authToken";

const DATE_OPTIONS = [
  { value: "", label: "Any date" },
  { value: "2026-10-01", label: "1 October" },
  { value: "2026-10-05", label: "5 October" },
  { value: "2026-10-08", label: "8 October" },
  { value: "2026-10-10", label: "10 October" },
  { value: "2026-10-12", label: "12 October" },
  { value: "2026-10-15", label: "15 October" },
  { value: "2026-10-20", label: "20 October" },
];

const REPORT_REASONS = ["Wrong_Number", "Misleading_Photos", "Scam_OR_Spam"];

// Helper to validate Bangladeshi Phone Numbers (11 digits starting with 013-019)
export const isValidBdPhone = (phone: string) => /^01[3-9]\d{8}$/.test(phone);

// Types
export type GoogleAuthProfile = {
  name: string;
  email: string;
  phone?: string;
  os: string;
  photo?: string;
  browser: string;
  device: string;
  ipAddress: string;
  isVerify: boolean;
};

type GoogleClaims = {
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};

// Helper function to extract user device info & IP address
async function createGoogleAuthProfile(
  credential: string,
  phone?: string,
): Promise<GoogleAuthProfile> {
  const encodedPayload = credential.split(".")[1];
  if (!encodedPayload) throw new Error("Google returned an invalid credential.");

  const normalizedPayload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
  const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
  const binaryPayload = atob(paddedPayload);
  const payloadBytes = Uint8Array.from(binaryPayload, (character) => character.charCodeAt(0));
  const claims = JSON.parse(new TextDecoder().decode(payloadBytes)) as GoogleClaims;

  const deviceInfo = Bowser.getParser(
    typeof window !== "undefined" ? navigator.userAgent : "",
  ).getResult();
  const ipInfoUrl = process.env.NEXT_PUBLIC_IP_INFO_URL ?? "https://api.ipify.org?format=json";

  let ipAddress = "N/A";
  try {
    const response = await fetch(ipInfoUrl);
    if (!response.ok) throw new Error(`IP lookup returned ${response.status}.`);
    const result = (await response.json()) as { ip?: string };
    ipAddress = result.ip || "N/A";
  } catch {
    ipAddress = "N/A";
  }

  return {
    name: claims.name || "Unknown",
    email: claims.email || "Unknown",
    ...(phone ? { phone } : {}),
    photo: claims.picture,
    os: `${deviceInfo.os.name || "Unknown"} ${deviceInfo.os.version || ""}`.trim(),
    browser: deviceInfo.browser.name || "Unknown",
    device: deviceInfo.platform.type
      ? deviceInfo.platform.type.charAt(0).toUpperCase() + deviceInfo.platform.type.slice(1)
      : "Desktop",
    ipAddress,
    isVerify: claims.email_verified ?? false,
  };
}

export function Modals() {
  const filterOpen = useAppSelector((state) => state.ui.filterOpen);
  const step = useAppSelector((state) => state.session.step);

  const callId = useAppSelector((state) => state.ui.callId);
  const reportId = useAppSelector((state) => state.ui.reportId);
  const locked = filterOpen || step !== "closed" || Boolean(callId) || Boolean(reportId);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);

  return (
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      {filterOpen ? <FilterModal /> : null}
      {step !== "closed" ? <AccountModal /> : null}
      {callId ? <CallModal /> : null}
      {reportId ? <ReportModal /> : null}
    </GoogleOAuthProvider>
  );
}

function Backdrop({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
      role="presentation"
    >
      <button type="button" className="absolute inset-0" aria-label={label} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-3xl bg-card p-5 shadow-pop"
      >
        {children}
      </div>
    </div>
  );
}

function FilterModal() {
  const dispatch = useAppDispatch();
  const maxRent = useAppSelector((state) => state.filters.maxRent);
  const availableFrom = useAppSelector((state) => state.filters.availableFrom);
  const [draftRent, setDraftRent] = useState(maxRent);
  const [draftDate, setDraftDate] = useState(availableFrom);

  return (
    <Backdrop label="Close filters" onClose={() => dispatch(setFilterOpen(false))}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <SlidersHorizontal className="size-4" />
          Filters
        </h2>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full hover:bg-chip"
          aria-label="Close filters"
          onClick={() => dispatch(setFilterOpen(false))}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <p className="label">Rent range</p>
        <p className="text-sm font-semibold text-primary">
          {formatRent(draftRent)} <span className="font-medium text-muted">/ month</span>
        </p>
      </div>
      <Slider.Root
        className="relative mt-4 flex h-6 w-full touch-none items-center"
        min={RENT_MIN}
        max={RENT_MAX}
        step={500}
        value={[draftRent]}
        onValueChange={(value) => setDraftRent(value[0] ?? RENT_MAX)}
        aria-label="Maximum rent"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-chip">
          <Slider.Range className="absolute h-full rounded-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb className="block size-5 rounded-full border-2 border-primary bg-card shadow-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </Slider.Root>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>Min: {formatRent(RENT_MIN)}</span>
        <span>Max: {formatRent(RENT_MAX)}</span>
      </div>
      <label className="mt-6 block">
        <span className="label flex items-center gap-2">
          <Calendar className="size-3.5" />
          Available from
        </span>
        <select
          className="field mt-2"
          value={draftDate}
          onChange={(event) => setDraftDate(event.target.value)}
        >
          {DATE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-11 rounded-xl border border-ink text-sm font-semibold"
          onClick={() => {
            setDraftRent(RENT_MAX);
            setDraftDate("");
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="h-11 rounded-xl bg-primary text-sm font-semibold text-on-primary hover:bg-primary-deep"
          onClick={() => {
            dispatch(applyRentAndDate({ maxRent: draftRent, availableFrom: draftDate }));
            dispatch(setFilterOpen(false));
          }}
        >
          Apply
        </button>
      </div>
    </Backdrop>
  );
}

// The backend answers with "Phone number is required" when the Google account
// has no account yet (same signal your original login code already used).
function isPhoneRequiredError(error: any) {
  const message = String(error?.data?.message || error?.message || "");
  return message.includes("Phone number is required");
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="mx-auto size-9" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function AccountModal() {
  const dispatch = useAppDispatch();
  const draftPhone = useAppSelector((state) => state.session.draftPhone);

  // The modal ALWAYS opens on "Account Creation" first, whichever way it was opened.
  // "Log In" is only shown when the user taps "Already have an account? Log in".
  const [view, setView] = useState<"create" | "login">("create");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [accountName, setAccountName] = useState("");
  // Set only after Google verified a NEW user (no account in the database yet).
  // While it is null we show the Google screen; once set we show "Almost Done".
  const [pendingProfile, setPendingProfile] = useState<GoogleAuthProfile | null>(null);
  const [createAccount] = useCreateAccountMutation();

  const isPhoneValid = isValidBdPhone(draftPhone);
  const isNameValid = accountName.trim().length >= 2;
  const canContinue = isNameValid && isPhoneValid;

  // ---------- STEP 1: GOOGLE VERIFICATION (Account Creation / Log In modal) ----------
  // Same handler for both modals: the database decides what happens next.
  //  - account already exists  -> logged in right away, no name/phone step
  //  - no account yet          -> "Almost Done" step (name from Google + phone)
  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) {
      setErrorMsg("Google sign-in failed. Please try again.");
      return;
    }

    setBusy(true);
    setErrorMsg("");
    try {
      const profile = await createGoogleAuthProfile(response.credential);

      try {
        const res = await createAccount(profile).unwrap();

        if (!tokenRecorded(res.data?.accessToken, TOKEN_NAME)) {
          throw new Error("Could not save the login token.");
        }
        dispatch(
          authenticateUser({
            name: profile.name,
            email: profile.email,
            phone: profile.phone ?? "",
          }),
        );
      } catch (error: any) {
        if (!isPhoneRequiredError(error)) throw error;

        // New user -> take the name from Google and ask for the mobile number.
        setAccountName(profile.name === "Unknown" ? "" : profile.name);
        setPendingProfile(profile);
      }
    } catch (error: any) {
      console.error("Error during Google sign-in:", error);
      const backendMessage = error?.data?.message || error?.message || "";
      setErrorMsg(backendMessage || "Could not sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ---------- STEP 2: ALMOST DONE (new users only) ----------
  async function handleCompleteSetup() {
    if (!pendingProfile || !canContinue) return;

    setBusy(true);
    setErrorMsg("");
    try {
      const name = accountName.trim();
      // Edited name + phone from the form, everything else from Google.
      const profile: GoogleAuthProfile = { ...pendingProfile, name, phone: draftPhone };

      const res = await createAccount(profile).unwrap();
      if (!tokenRecorded(res.data?.accessToken, TOKEN_NAME)) {
        throw new Error("Could not save the login token.");
      }
      dispatch(authenticateUser({ name, email: profile.email, phone: draftPhone }));
    } catch (error: any) {
      console.error("Error creating account:", error);
      setErrorMsg(error?.data?.message || "Could not create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function switchAccountStep(nextStep: "login" | "create") {
    setErrorMsg("");
    setView(nextStep);
  }

  return (
    <Backdrop label="Close account" onClose={() => dispatch(closeAccount())}>
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full hover:bg-chip"
          aria-label="Close account"
          onClick={() => dispatch(closeAccount())}
        >
          <X className="size-4" />
        </button>
      </div>

      {pendingProfile ? (
        /* ============ ALMOST DONE: name (editable) + mobile number ============ */
        <div className="px-1 pb-3 text-center">
          <GoogleMark />
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Almost Done{pendingProfile.name !== "Unknown" ? `, ${pendingProfile.name.split(" ")[0]}` : ""}!
          </h2>

          <label className="mt-5 block text-left">
            <span className="text-sm font-semibold">Full Name</span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              className="field mt-2"
              value={accountName}
              onChange={(event) => {
                setAccountName(event.target.value);
                setErrorMsg("");
              }}
            />
          </label>

          <label className="mt-4 block text-left">
            <span className="text-sm font-semibold">Enter Your Mobile Number</span>
            <span className="mt-2 flex h-12 items-center gap-2 rounded-xl border border-line bg-card px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <BdFlag className="h-4 w-6 shrink-0" />
              <input
                inputMode="numeric"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                className="h-full w-full bg-transparent text-sm outline-none placeholder:text-faint"
                value={draftPhone}
                onChange={(event) => {
                  dispatch(setDraftPhone(event.target.value));
                  setErrorMsg("");
                }}
              />
            </span>
          </label>
          <p className="mt-1.5 text-left text-xs text-muted">
            Required for landlords to contact you / for listing your home.
          </p>

          {draftPhone.length > 0 && !isPhoneValid && (
            <p className="mt-1.5 text-left text-xs text-red-500">
              Enter a valid 11-digit Bangladeshi mobile number (013-019).
            </p>
          )}

          {errorMsg && (
            <p role="alert" className="mt-3 text-left text-xs text-red-500">
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            disabled={!canContinue || busy}
            onClick={() => void handleCompleteSetup()}
            className="mt-5 h-12 w-full rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creating your account..." : "Complete Account Setup"}
          </button>

          <p className="mt-3 text-xs text-muted">
            By continuing, you agree to the <span className="underline">Terms &amp; Conditions</span>{" "}
            and <span className="underline">Privacy Policy</span>.
          </p>
        </div>
      ) : view === "create" ? (
        /* ==================== ACCOUNT CREATION (default) ==================== */
        <div className="px-1 pb-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Account Creation</h2>
          <p className="mt-1 text-sm text-muted">Get all your listing in your Account</p>

          <div
            className={`mt-6 flex justify-center ${busy ? "pointer-events-none opacity-50" : ""}`}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorMsg("Google sign-in failed. Please try again.")}
              shape="pill"
              theme="outline"
              size="large"
              width="320"
              text="continue_with"
            />
          </div>

          {busy && <p className="mt-3 text-xs text-muted">Checking your account...</p>}

          {errorMsg && (
            <p role="alert" className="mt-3 text-xs text-red-500">
              {errorMsg}
            </p>
          )}

          <p className="mt-5 text-sm text-muted">
            Already have an account?{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() => switchAccountStep("login")}
            >
              Log in
            </button>
          </p>
        </div>
      ) : (
        /* ==================== LOG IN ==================== */
        <div className="px-1 pb-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Log In</h2>
          <p className="mt-1 text-sm text-muted">Get all your listing in your Account</p>

          <div
            className={`mt-6 flex justify-center ${busy ? "pointer-events-none opacity-50" : ""}`}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorMsg("Google login failed. Please try again.")}
              shape="pill"
              theme="outline"
              size="large"
              width="320"
              text="continue_with"
            />
          </div>

          {busy && <p className="mt-3 text-xs text-muted">Checking your account...</p>}

          {errorMsg && (
            <p role="alert" className="mt-3 text-xs text-red-500">
              {errorMsg}
            </p>
          )}

          <p className="mt-5 text-sm text-muted">
            New User?{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() => switchAccountStep("create")}
            >
              Create an Account
            </button>
          </p>
        </div>
      )}
    </Backdrop>
  );
}

function CallModal() {
  const dispatch = useAppDispatch();
  const callId = useAppSelector((state) => state.ui.callId);
  const seed = useAppSelector((state) => state.listings.seed);
  const userListings = useAppSelector((state) => state.listings.userListings);
  const listing = [...userListings, ...seed].find((item) => item.id === callId);

  if (!listing) return null;

  return (
    <Backdrop label="Close call" onClose={() => dispatch(setCallId(null))}>
      <CallBody listing={listing} onClose={() => dispatch(setCallId(null))} />
    </Backdrop>
  );
}

function CallBody({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Direct call</h2>
      <p className="mt-1 text-sm text-muted">{listing.name}</p>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{formatPhone(listing.phone)}</p>
      <p className="mt-1 text-sm text-muted">
        {listing.area}
        {listing.rent !== undefined ? ` · ${formatRent(listing.rent)} / month` : ""}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-11 rounded-full border border-line text-sm font-semibold"
          onClick={onClose}
        >
          Close
        </button>
        <a
          href={telHref(listing.phone)}
          className="inline-flex h-11 items-center justify-center rounded-full bg-call text-sm font-semibold text-on-primary"
        >
          Call now
        </a>
      </div>
    </div>
  );
}

function ReportModal() {
  const dispatch = useAppDispatch();
  const reportId = useAppSelector((state) => state.ui.reportId);
  const [reason, setReason] = useState(REPORT_REASONS[0] ?? "");
  const [recordedReport, { error, isLoading, reset }] = useRecoredReportMutation();

  if (!reportId) return null;

  const closeError = () => {
    dispatch(setReportId(null));
    reset();
  };

  if (error) {
    return (
      <Backdrop label="Close report error" onClose={closeError}>
        <div className="max-h-[70vh] overflow-y-auto">
          <ErrorPage error={error} />
        </div>
        <button
          type="button"
          className="mt-4 h-11 w-full rounded-full border border-line text-sm font-semibold"
          onClick={closeError}
        >
          Close
        </button>
      </Backdrop>
    );
  }

  const submitReport = async () => {
    // ডাইনামিক আইপি ফেচ করার লজিক
    let ipAddress = "N/A";
    try {
      const ipInfoUrl = process.env.NEXT_PUBLIC_IP_INFO_URL ?? "https://api.ipify.org?format=json";
      const response = await fetch(ipInfoUrl);
      if (response.ok) {
        const result = (await response.json()) as { ip?: string };
        ipAddress = result.ip || "N/A";
      }
    } catch {
      ipAddress = "N/A";
    }

    const result = await recordedReport({ roomId: reportId, reportType: reason, ipAddress });
    if ("error" in result) return;

    const response = result.data;
    if (!response.success) {
      dispatch(setReportId(null));
      dispatch(showToast(response.message || "Could not submit your report."));
      return;
    }

    dispatch(reportListing(reportId));
    dispatch(
      showToast(
        response.data.success ? response.message : response.data.message || response.message,
      ),
    );
  };

  return (
    <Backdrop label="Close report" onClose={() => dispatch(setReportId(null))}>
      <h2 className="text-lg font-semibold">Report listing</h2>
      <p className="mt-1 text-sm text-muted">Tell us what looks wrong with this listing.</p>
      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Reason</legend>
        {REPORT_REASONS.map((item) => (
          <label
            key={item}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name="reason"
              className="accent-primary"
              checked={reason === item}
              onChange={() => setReason(item)}
            />
            {item}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="mt-5 h-11 w-full rounded-full bg-primary text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        onClick={() => void submitReport()}
      >
        {isLoading ? "Submitting..." : "Submit report"}
      </button>
    </Backdrop>
  );
}