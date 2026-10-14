"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Camera, CameraOff, Check, LoaderCircle, RotateCcw, SwitchCamera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_CAPTURE_SIZE = 5 * 1024 * 1024;
const MAX_CAPTURE_EDGE = 1600;

type LiveCameraDialogProps = {
  disabled?: boolean;
  onPhotoCaptured: (file: File) => Promise<boolean>;
};

export function LiveCameraDialog({ disabled = false, onPhotoCaptured }: LiveCameraDialogProps) {
  const [open, setOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [retryToken, setRetryToken] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [captureError, setCaptureError] = useState("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || capturedFile) return;

    let active = true;
    let stream: MediaStream | null = null;
    setIsStarting(true);
    setCameraError("");
    setHasMultipleCameras(false);

    const startCamera = async () => {
      if (!window.isSecureContext) {
        setCameraError("Camera access requires a secure connection. Open this page over HTTPS and try again.");
        setIsStarting(false);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Live camera access is not supported by this browser.");
        setIsStarting(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facingMode } },
        });
        if (!active) {
          stopCameraStream(stream);
          return;
        }

        const video = videoRef.current;
        if (!video) throw new Error("The camera preview could not be displayed.");
        video.srcObject = stream;
        await video.play();
        if (!active) return;

        try {
          const cameras = await navigator.mediaDevices.enumerateDevices();
          if (active) setHasMultipleCameras(cameras.filter((device) => device.kind === "videoinput").length > 1);
        } catch {
          // Camera enumeration is optional; the live preview can still be used.
        }
      } catch (error) {
        if (active) setCameraError(getCameraErrorMessage(error));
      } finally {
        if (active) setIsStarting(false);
      }
    };

    void startCamera();
    return () => {
      active = false;
      if (stream) stopCameraStream(stream);
      if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
    };
  }, [capturedFile, facingMode, open, retryToken]);

  useEffect(() => {
    return () => {
      if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    };
  }, [capturedPreview]);

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCapturedFile(null);
      setCapturedPreview(null);
      setCameraError("");
      setCaptureError("");
      setIsAddingPhoto(false);
    }
    setOpen(nextOpen);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setCaptureError("The camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    try {
      setCaptureError("");
      const file = await createCameraPhoto(video);
      setCapturedFile(file);
      setCapturedPreview(URL.createObjectURL(file));
    } catch {
      setCaptureError("Could not prepare this photo. Please try again.");
    }
  };

  const addPhoto = async () => {
    if (!capturedFile || isAddingPhoto) return;
    setIsAddingPhoto(true);
    try {
      if (await onPhotoCaptured(capturedFile)) changeOpen(false);
    } finally {
      setIsAddingPhoto(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-card px-4 text-xs font-semibold text-ink hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="size-4" aria-hidden="true" />
          Live Camera
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-4 shadow-pop outline-none sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-tight">Live Camera</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Take a photo now, then review it before adding it to your room pictures.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close camera"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-chip hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-ink" aria-busy={isStarting}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Live camera preview"
              className={`absolute inset-0 h-full w-full object-cover ${capturedPreview ? "hidden" : ""}`}
            />
            {capturedPreview ? (
              <img src={capturedPreview} alt="Captured photo preview" className="absolute inset-0 h-full w-full object-contain" />
            ) : null}
            {!capturedPreview && isStarting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-on-primary">
                <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
                <p className="text-sm">Starting camera…</p>
              </div>
            ) : null}
            {!capturedPreview && cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-on-primary">
                <CameraOff className="size-7 text-on-primary/80" aria-hidden="true" />
                <p role="alert" className="max-w-sm text-sm leading-relaxed">{cameraError}</p>
              </div>
            ) : null}
          </div>

          {cameraError ? (
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Try camera again
            </button>
          ) : null}

          {hasMultipleCameras && !capturedFile ? (
            <button
              type="button"
              disabled={isStarting}
              onClick={() => setFacingMode((mode) => mode === "environment" ? "user" : "environment")}
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm font-medium text-muted hover:bg-chip hover:text-ink disabled:opacity-50"
            >
              <SwitchCamera className="size-4" aria-hidden="true" />
              Switch camera
            </button>
          ) : null}

          {captureError ? <p role="alert" className="mt-3 text-sm text-amber">{captureError}</p> : null}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {capturedFile ? (
              <>
                <button
                  type="button"
                  disabled={isAddingPhoto}
                  onClick={() => {
                    setCaptureError("");
                    setCapturedFile(null);
                    setCapturedPreview(null);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:bg-chip disabled:opacity-50"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Retake
                </button>
                <button
                  type="button"
                  disabled={isAddingPhoto}
                  onClick={() => void addPhoto()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAddingPhoto ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                  {isAddingPhoto ? "Adding photo…" : "Add photo"}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isStarting || Boolean(cameraError)}
                onClick={() => void capturePhoto()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
              >
                <Camera className="size-4" aria-hidden="true" />
                Capture photo
              </button>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted" aria-live="polite">
            {capturedFile ? "Review your photo before adding it." : "Camera access is used only while this dialog is open."}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function stopCameraStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function getCameraErrorMessage(error: unknown) {
  const errorName = error instanceof DOMException ? error.name : "";
  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError" || errorName === "SecurityError") {
    return "Camera access was blocked. Allow camera access in your browser settings and try again.";
  }
  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }
  if (errorName === "NotReadableError" || errorName === "AbortError") {
    return "The camera is busy or unavailable. Close other apps using it and try again.";
  }
  if (errorName === "OverconstrainedError") {
    return "That camera is unavailable. Try switching cameras and try again.";
  }
  return "Could not start the camera. Check your device settings and try again.";
}

async function createCameraPhoto(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  let blob = await canvasToJpeg(canvas, 0.84);
  if (blob.size > MAX_CAPTURE_SIZE) blob = await canvasToJpeg(canvas, 0.68);
  if (blob.size > MAX_CAPTURE_SIZE) {
    canvas.width = Math.round(canvas.width * 0.75);
    canvas.height = Math.round(canvas.height * 0.75);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    blob = await canvasToJpeg(canvas, 0.58);
  }
  if (blob.size > MAX_CAPTURE_SIZE) throw new Error("Photo exceeds the upload limit.");

  return new File([blob], `room-photo-${Date.now()}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Photo encoding failed."));
    }, "image/jpeg", quality);
  });
}
