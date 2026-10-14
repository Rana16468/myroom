export type FooterLink = { label: string; href: string };

export const FOOTER_BRAND = {
  name: "MyRoom",
  domain: "Myroom.com.bd",
  blurb: "Need a room or roommate in Dhaka? Browse listings, call the host directly, or post your own room.",
  rating: { score: 4.7, reviews: "20,000+" },
};

export const FOOTER_EXPLORE_LINKS: FooterLink[] = [
  { label: "Explore rooms", href: "/" },
  { label: "List your room", href: "/list" },
  { label: "My profile", href: "/profile" },
];

export const FOOTER_SUPPORT_LINKS: FooterLink[] = [
  { label: "Safety guidelines", href: "/safety" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
];
