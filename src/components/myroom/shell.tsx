"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, LogOut, Plus, Search, UserRound } from "lucide-react";
import { Modals } from "@/components/myroom/modals";
import { logout, openAccount, showToast } from "@/store/myroom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hasValidAccessToken, deleteToken, TOKEN_NAME } from "@/utility/authToken";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname === "/list";

  return (
    <div className="flex-1 bg-paper text-ink">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Header compactHidden={hideHeader} />
      <main
        id="content"
        className={`mx-auto w-full max-w-6xl px-4 pb-12 lg:pb-16 ${
          pathname === "/" ? "pt-2 sm:pt-4" : "pt-4"
        }`}
      >
        {children}
      </main>
      <BottomNav />
      <Modals />
      <Toast />
    </div>
  );
}

function Header({ compactHidden }: { compactHidden: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.session.user);
  const [menu, setMenu] = useState(false);
  const first = user?.name.split(" ")[0] ?? "Account";

  return (
    <header className={`sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur ${compactHidden ? "hidden lg:block" : ""}`}>
      <div className="mx-auto flex min-h-12 w-full max-w-6xl items-center gap-2 px-4 py-1.5 sm:min-h-16 sm:gap-3 sm:py-2">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary sm:size-9 sm:rounded-xl">
            <Home className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm leading-none font-semibold sm:text-base">MyRoom</span>
            <span className="mt-1 hidden text-xs text-muted sm:block">Find a room, rent a room, for business</span>
            <span className="mt-0.5 block truncate text-xs font-medium tracking-wide text-muted uppercase sm:hidden">
              Find your room, in seconds
            </span>
          </span>
        </Link>
        <div className="flex-1" />
        <nav className="hidden items-center gap-2 lg:flex">
          <Link
            href="/"
            className={`inline-flex h-10 items-center rounded-full px-3 text-sm font-medium ${
              pathname === "/" ? "text-ink" : "text-muted"
            }`}
          >
            Explore
          </Link>
          {user && hasValidAccessToken() ? (
            <Link
              href="/list"
              className="inline-flex h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-deep"
            >
              <Plus className="size-4" />
              List your room
            </Link>
          ) : null}
        </nav>
        {user ? (
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-on-primary lg:h-10 lg:border lg:border-line lg:bg-card lg:px-4 lg:text-sm lg:text-ink"
              aria-expanded={menu}
              onClick={() => setMenu((open) => !open)}
            >
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-card/20 text-xs lg:bg-primary lg:text-on-primary">
                {first.slice(0, 1)}
              </span>
              {first}
            </button>
            {menu ? (
              <div className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-line bg-card p-3 shadow-pop">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted">{user.phone}</p>
                <Link
                  href="/profile"
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-medium hover:bg-chip"
                  onClick={() => setMenu(false)}
                >
                  <UserRound className="size-4" />
                  My profile
                </Link>
                <button
                  type="button"
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-medium"
                  onClick={() => {
                    deleteToken(TOKEN_NAME);
                    dispatch(logout());
                    setMenu(false);
                    dispatch(showToast("Logged out"));
                    if (pathname === "/profile" || pathname === "/list") {
                      router.replace("/");
                    }
                  }}
                >
                  <LogOut className="size-4" />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-on-primary lg:h-10 lg:border lg:border-line lg:bg-card lg:px-4 lg:text-sm lg:font-medium lg:text-ink"
            onClick={() => dispatch(openAccount())}
          >
            Account
          </button>
        )}
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.session.user);
  const explore = pathname === "/";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 lg:hidden" aria-label="Primary">
      <div className="mx-auto flex max-w-md gap-3">
        <Link
          href="/"
          className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold shadow-card ${
            explore ? "bg-primary text-on-primary" : "border border-line bg-card text-muted"
          }`}
        >
          <Search className="size-4" />
          Explore rooms
        </Link>
        {user && hasValidAccessToken() ? (
          <Link
            href="/list"
            className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold shadow-card ${
              pathname === "/list" ? "bg-primary text-on-primary" : "border border-line bg-card text-muted"
            }`}
          >
            <Plus className="size-4" />
            List your room
          </Link>
        ) : null}
      </div>
    </nav>
  );
}


function Toast() {
  const dispatch = useAppDispatch();
  const toast = useAppSelector((state) => state.ui.toast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => dispatch(showToast(null)), 2600);
    return () => window.clearTimeout(timer);
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-on-primary shadow-pop lg:bottom-6">
      {toast}
    </div>
  );
}
