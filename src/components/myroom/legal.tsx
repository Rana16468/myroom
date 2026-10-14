import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/myroom/shell";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppShell>
      <article className="mx-auto max-w-2xl pt-4 lg:pt-10">
        <Link href="/" className="text-sm font-semibold text-primary">
          Back to rooms
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">{children}</div>
      </article>
    </AppShell>
  );
}
