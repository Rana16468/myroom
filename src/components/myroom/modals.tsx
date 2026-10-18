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
  showCreate,
  showLogin,
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

function AccountModal() {
  const dispatch = useAppDispatch();
  const step = useAppSelector((state) => state.session.step);
  const draftPhone = useAppSelector((state) => state.session.draftPhone);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [accountName, setAccountName] = useState("");
  // Create flow: false = name + phone form, true = Google authentication
  const [verifying, setVerifying] = useState(false);
  const [createAccount] = useCreateAccountMutation();

  const isPhoneValid = isValidBdPhone(draftPhone);
  const isNameValid = accountName.trim().length >= 2;
  const canContinue = isNameValid && isPhoneValid;

  // ---------- LOGIN ----------
  async function handleLoginSuccess(response: CredentialResponse) {
    if (!response.credential) {
      setErrorMsg("Google sign-in failed. Please try again.");
      return;
    }

    setBusy(true);
    setErrorMsg("");
    try {
      const profile = await createGoogleAuthProfile(response.credential);
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
      console.error("Error during Google login:", error);
      const backendMessage = error?.data?.message || error?.message || "";

      if (backendMessage.includes("Phone number is required")) {
        // অ্যাকাউন্ট নেই → Create Account স্ক্রিনে রিডাইরেক্ট
        setVerifying(false);
        dispatch(showCreate());
        setErrorMsg("No account found. Please enter your name and mobile number to sign up.");
      } else {
        setErrorMsg(backendMessage || "Could not log you in. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  // ---------- CREATE ACCOUNT (after Google auth) ----------
  async function handleSignupGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) {
      setErrorMsg("Google sign-up failed. Please try again.");
      return;
    }
    if (!canContinue) {
      setVerifying(false);
      return;
    }

    setBusy(true);
    setErrorMsg("");
    try {
      const googleProfile = await createGoogleAuthProfile(response.credential, draftPhone);
      const name = accountName.trim();

      // ফর্মের নাম + ফোন, Google-এর বাকি তথ্যের সাথে একসাথে
      const profile: GoogleAuthProfile = { ...googleProfile, name, phone: draftPhone };

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
    setVerifying(false);
    setErrorMsg("");
    dispatch(nextStep === "login" ? showLogin() : showCreate());
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

      {step !== "create" ? (
        /* ==================== LOG IN ==================== */
        <div className="px-1 pb-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Log in</h2>
          <p className="mt-1 text-sm text-muted">Quick log in with your Google account</p>

          <div
            className={`mt-6 flex justify-center ${busy ? "pointer-events-none opacity-50" : ""}`}
          >
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => setErrorMsg("Google login failed. Please try again.")}
              shape="pill"
              theme="outline"
              size="large"
              width="320"
              text="signin_with"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="mt-3 text-xs text-red-500">
              {errorMsg}
            </p>
          )}

          <p className="mt-5 text-sm text-muted">
            New here?{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() => switchAccountStep("create")}
            >
              Create an account
            </button>
          </p>
        </div>
      ) : !verifying ? (
        /* ============ CREATE ACCOUNT — STEP 1: NAME + PHONE ============ */
        <div className="px-1 pb-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Create Account</h2>
          <p className="mt-1 text-sm text-muted">Enter your details to get started</p>

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
            disabled={!canContinue}
            onClick={() => {
              setErrorMsg("");
              setVerifying(true);
            }}
            className="mt-5 h-12 w-full rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            Complete Account Setup
          </button>

          <p className="mt-3 text-xs text-muted">
            By agreeing, you agree to the <span className="underline">Terms &amp; Conditions</span>{" "}
            and <span className="underline">Privacy Policy</span>.
          </p>

          <p className="mt-4 text-sm text-muted">
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
        /* ============ CREATE ACCOUNT — STEP 2: GOOGLE AUTH ============ */
        <div className="px-1 pb-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Almost done, {accountName.trim().split(" ")[0]}!
          </h2>
          <p className="mt-1 text-sm text-muted">
            Verify with Google to finish creating your account
          </p>

          <div
            className={`mt-6 flex justify-center ${busy ? "pointer-events-none opacity-50" : ""}`}
          >
            <GoogleLogin
              onSuccess={handleSignupGoogleSuccess}
              onError={() => setErrorMsg("Google sign-up failed. Please try again.")}
              shape="pill"
              theme="outline"
              size="large"
              width="320"
              text="continue_with"
            />
          </div>

          {busy && <p className="mt-3 text-xs text-muted">Creating your account...</p>}

          {errorMsg && (
            <p role="alert" className="mt-3 text-xs text-red-500">
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            className="mt-5 text-xs text-muted underline disabled:opacity-50"
            onClick={() => {
              setVerifying(false);
              setErrorMsg("");
            }}
          >
            Edit name or mobile number
          </button>
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
