"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hasValidAccessToken } from "@/utility/authToken";
import { loginRedirectHref } from "@/utility/authRedirect";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!hasValidAccessToken()) {
      router.replace(
        loginRedirectHref(
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
        ),
      );
      return;
    }

    setAuthorized(true);
  }, [pathname, router]);

  if (!authorized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted" role="status">
        Checking your account…
      </div>
    );
  }

  return children;
}
