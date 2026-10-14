"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Home, Star } from "lucide-react";
import { AREAS, MORE_CITIES, TOP_CITIES } from "@/data/rooms";
import { FOOTER_BRAND, FOOTER_EXPLORE_LINKS, FOOTER_SUPPORT_LINKS, type FooterLink } from "@/data/footer";
import { BdFlag } from "@/components/myroom/icons";
import { chooseArea, resetFilters, setQuery } from "@/store/myroom";
import { useAppDispatch } from "@/store/hooks";

const linkClass =
  "rounded-sm text-sm text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold tracking-wide text-faint uppercase">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function FooterLinkList({ links, label }: { links: FooterLink[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [more, setMore] = useState(false);
  const cities = more ? [...TOP_CITIES, ...MORE_CITIES] : TOP_CITIES;
  const year = new Date().getFullYear();

  const pickCity = (city: string) => {
    if (AREAS.includes(city)) {
      dispatch(setQuery(""));
      dispatch(chooseArea(city));
    } else {
      dispatch(resetFilters());
      dispatch(setQuery(city));
    }
    router.push("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-auto border-t border-line bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.6fr_1fr] lg:gap-12">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-on-primary">
              <Home className="size-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold">{FOOTER_BRAND.name}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{FOOTER_BRAND.blurb}</p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3">
            <span className="flex gap-0.5 text-call" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <Star key={index} className="size-4 fill-current" />
              ))}
            </span>
            <span className="text-xs text-muted">
              <span className="font-semibold text-ink">TrustScore {FOOTER_BRAND.rating.score}</span> ·{" "}
              {FOOTER_BRAND.rating.reviews} reviews
            </span>
          </div>
        </div>

        <FooterColumn title="Explore">
          <FooterLinkList links={FOOTER_EXPLORE_LINKS} label="Explore" />
        </FooterColumn>

        <FooterColumn title="Top cities">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {cities.map((city) => (
              <li key={city}>
                <button type="button" className={`${linkClass} text-left`} onClick={() => pickCity(city)}>
                  {city}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 rounded-sm text-sm font-semibold text-primary hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-expanded={more}
            onClick={() => setMore((open) => !open)}
          >
            {more ? "Fewer towns" : "More towns & cities"}
          </button>
        </FooterColumn>

        <FooterColumn title="Support">
          <FooterLinkList links={FOOTER_SUPPORT_LINKS} label="Support" />
        </FooterColumn>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 pt-5 pb-28 text-xs text-faint sm:flex-row sm:justify-between lg:pb-6">
          <p>
            © {year} {FOOTER_BRAND.domain}. All rights reserved.
          </p>
          <p className="inline-flex items-center gap-2">
            <BdFlag className="h-3 w-[18px]" />
            Made for renters across Dhaka
          </p>
        </div>
      </div>
    </footer>
  );
}
