"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { installPreviewHostBridge } from "@/lib/preview-host-bridge";

const ROUTES = ["/", "/list", "/terms", "/safety", "/privacy"];

export function PreviewBridge() {
  const router = useRouter();

  useEffect(() => {
    return installPreviewHostBridge({
      navigate: (path) => router.push(path),
      getRoutePaths: () => ROUTES,
    });
  }, [router]);

  return null;
}
