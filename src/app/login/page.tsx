"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { AppShell } from "@/components/myroom/shell";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { showLogin } from "@/store/myroom";
import { hasValidAccessToken } from "@/utility/authToken";
import { safePostLoginRedirect } from "@/utility/authRedirect";

function LoginPageContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppSelector((state) => state.session.user);
  const redirect = safePostLoginRedirect(searchParams.get("redirect"));

  useEffect(() => {
    if (hasValidAccessToken()) {
      router.replace(redirect ?? "/");
      return;
    }

    dispatch(showLogin());
  }, [dispatch, redirect, router, user]);

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Log in to MyRoom</h1>
      <p className="mt-2 text-sm text-muted">Continue with Google to access this feature.</p>
      <button
        type="button"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary"
        onClick={() => dispatch(showLogin())}
      >
        <LogIn className="size-4" />
        Continue with Google
      </button>
    </section>
  );
}

export default function LoginPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex min-h-[55vh] items-center justify-center text-sm text-muted" role="status">
            Loading login…
          </div>
        }
      >
        <LoginPageContent />
      </Suspense>
    </AppShell>
  );
}
