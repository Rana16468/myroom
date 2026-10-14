export const LISTING_TYPES = [
  "Family",
  "Bachelor",
  "Sublet",
  "Hostel",
  "Office",
  "Other",
] as const;

export type ListingType = (typeof LISTING_TYPES)[number];

export function normalizeListingType(value: string): ListingType | null {
  const normalized = value.trim().toLowerCase();
  return LISTING_TYPES.find((type) => {
    const typeName = type.toLowerCase();
    return normalized === typeName || normalized.startsWith(`${typeName} `) ||
      normalized.startsWith(`${typeName}/`);
  }) ?? null;
}

export type Listing = {
  id: string;
  name: string;
  postedLabel?: string;
  description: string;
  descriptionBn?: string;
  photos: string[];
  rent?: number;
  availableLabel?: string;
  availableISO?: string;
  area: string;
  neighborhood: string;
  locationPath?: string;
  address: string;
  types: ListingType;
  phone: string;
};

export const RENT_MIN = 500;
export const RENT_MAX = 25000;

export const AREA_GROUPS: string[][] = [
  ["Dhanmondi", "Gulshan", "Banani", "Mirpur"],
  ["Uttara", "Mohammadpur", "Bashundhara", "Motijheel", "Lalmatia", "Badda"],
];

export const AREAS = AREA_GROUPS.flat();

export const NEIGHBORHOODS: Record<string, string[]> = {
  Dhanmondi: ["Dhanmondi 15", "Dhanmondi 27", "Dhanmondi 32", "Jigatola"],
  Gulshan: ["Gulshan 1", "Gulshan 2"],
  Banani: ["Banani 11", "Banani 8"],
  Mirpur: ["Mirpur 10", "Mirpur 2", "Kallyanpur"],
  Uttara: ["Uttara Sector 3", "Uttara Sector 7"],
  Mohammadpur: ["Mohammadpur", "Tajmahal Road"],
  Bashundhara: ["Bashundhara R/A", "Block D"],
  Motijheel: ["Motijheel", "Arambagh"],
  Lalmatia: ["Lalmatia Block A", "Lalmatia"],
  Badda: ["North Badda", "South Badda"],
};

export const NEARBY_AREAS = ["Dhanmondi", "Gulshan", "Banani", "Lalmatia", "Mohammadpur"];

export const TOP_CITIES = [...AREAS];

export const MORE_CITIES = ["Chattogram", "Sylhet", "Narayanganj", "Gazipur", "Rajshahi", "Khulna"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function labelFromISO(iso: string) {
  const parts = iso.split("-").map(Number);
  const month = MONTHS[(parts[1] ?? 1) - 1] ?? "";
  return `${parts[2] ?? ""} ${month}`.trim();
}

export function formatRent(amount: number) {
  return `${amount.toLocaleString("en-US")}TK`;
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return phone;
}

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `tel:+${digits}`;
  return `tel:+88${digits}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`;
  return letters.toUpperCase();
}

export function breadcrumb(listing: Pick<Listing, "area" | "neighborhood" | "locationPath">) {
  const locationPath = listing.locationPath ?? listing.area;
  if (locationPath.includes(" > ")) return locationPath.split(" > ");
  return ["Dhaka", "Dhaka", listing.area, listing.neighborhood];
}

export type Filters = {
  query: string;
  area: string | null;
  nearby: boolean;
  types: ListingType[];
  maxRent: number;
  availableFrom: string;
};

export function matchesListing(listing: Listing, filters: Filters) {
  if (filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    const blob = [
      listing.name,
      listing.area,
      listing.neighborhood,
      listing.locationPath ?? "",
      listing.address,
      listing.description,
      listing.descriptionBn ?? "",
      listing.types,
    ]
      .join(" ")
      .toLowerCase();
    if (!blob.includes(q)) return false;
  }
  const locationSegments = (listing.locationPath ?? listing.area).split(" > ");
  if (filters.nearby && !locationSegments.some((segment) => NEARBY_AREAS.includes(segment))) return false;
  const listingType = normalizeListingType(listing.types);
  if (filters.types.length > 0 && (!listingType || !filters.types.includes(listingType))) {
    return false;
  }
  if (filters.area && !locationSegments.includes(filters.area)) return false;
  if (listing.rent !== undefined && listing.rent > filters.maxRent) return false;
  if (filters.availableFrom && listing.availableISO && listing.availableISO > filters.availableFrom) return false;
  return true;
}

export const SEED_LISTINGS: Listing[] = [
  {
    id: "zakir-dhanmondi",
    name: "Zakir Ridwan Asraf",
    postedLabel: "Posted 2h ago",
    description:
      "Beautiful sun-drenched bedroom in a quiet professional apartment. Recently renovated with minimalist finishings, a wardrobe, and a calm work corner.",
    photos: ["/rooms/01.jpg", "/rooms/08.jpg", "/rooms/07.jpg"],
    rent: 9000,
    availableLabel: "1 October",
    availableISO: "2026-10-01",
    area: "Dhanmondi",
    neighborhood: "Dhanmondi 27",
    address: "House 27, Road 8, Dhanmondi, Dhaka",
    types: "Bachelor",
    phone: "01711004521",
  },
  {
    id: "karim-mirpur",
    name: "Karim Hostel",
    postedLabel: "Posted 1 day ago",
    description:
      "Clean shared room with two single beds, wardrobe, and a sunny window. Affordable for students, with a common kitchen on the same floor.",
    photos: ["/rooms/02.jpg", "/rooms/07.jpg"],
    rent: 4500,
    availableLabel: "5 October",
    availableISO: "2026-10-05",
    area: "Mirpur",
    neighborhood: "Mirpur 10",
    address: "House 12, Road 4, Mirpur 10, Dhaka",
    types: "Hostel",
    phone: "01622009811",
  },
  {
    id: "sarah-gulshan",
    name: "Sarah Jenkins",
    postedLabel: "Posted 3 days ago",
    description:
      "Bright shared living space with large windows, a sofa corner, and room for a small family or two flatmates. Walking distance to Gulshan 1.",
    photos: ["/rooms/03.jpg", "/rooms/05.jpg", "/rooms/04.jpg"],
    rent: 9000,
    availableLabel: "1 October",
    availableISO: "2026-10-01",
    area: "Gulshan",
    neighborhood: "Gulshan 1",
    address: "Road 12, Gulshan 1, Dhaka",
    types: "Family",
    phone: "01833001244",
  },
  {
    id: "mithila-banani",
    name: "Mithila Khan",
    postedLabel: "Posted 5 days ago",
    description:
      "A calm Banani room with a work corner and evening lake breeze. Walking distance to cafes, and a quiet building with a lift.",
    photos: ["/rooms/04.jpg", "/rooms/03.jpg", "/rooms/01.jpg"],
    rent: 14000,
    availableLabel: "20 October",
    availableISO: "2026-10-20",
    area: "Banani",
    neighborhood: "Banani 11",
    address: "Road 11, Banani, Dhaka",
    types: "Family",
    phone: "01914007630",
  },
  {
    id: "nadia-bashundhara",
    name: "Nadia Rahman",
    postedLabel: "Posted 6 days ago",
    description:
      "Cozy well-decorated living space with warm wood, large windows, and a calm residential lane. Marble kitchen shared with one other flatmate.",
    photos: ["/rooms/05.jpg", "/rooms/03.jpg"],
    rent: 12000,
    availableLabel: "15 October",
    availableISO: "2026-10-15",
    area: "Bashundhara",
    neighborhood: "Bashundhara R/A",
    address: "Block D, Bashundhara R/A, Dhaka",
    types: "Sublet",
    phone: "01755002318",
  },
  {
    id: "arif-lalmatia",
    name: "Arif Chowdhury",
    postedLabel: "Posted 8 days ago",
    description:
      "A compact, well-kept bachelor studio with a work desk, wardrobe, and strong daylight. Five minutes from the main road.",
    photos: ["/rooms/06.jpg", "/rooms/07.jpg", "/rooms/08.jpg"],
    rent: 7000,
    availableLabel: "10 October",
    availableISO: "2026-10-10",
    area: "Lalmatia",
    neighborhood: "Lalmatia Block A",
    address: "Block A, Lalmatia, Dhaka",
    types: "Bachelor",
    phone: "01576004419",
  },
  {
    id: "elena-dhanmondi",
    name: "Elena Rodriguez",
    postedLabel: "Posted 3 days ago",
    description:
      "Beautiful sun-drenched bedroom in a quiet professional apartment. Recently renovated with minimalist finishings.",
    photos: ["/rooms/07.jpg", "/rooms/08.jpg", "/rooms/01.jpg"],
    rent: 9000,
    availableLabel: "1 October",
    availableISO: "2026-10-01",
    area: "Dhanmondi",
    neighborhood: "Dhanmondi 15",
    address: "House 15, Road 4, Dhanmondi, Dhaka",
    types: "Bachelor",
    phone: "01322008765",
  },
  {
    id: "tajbir-mirpur",
    name: "Tajbir Islam",
    postedLabel: "Posted 2h ago",
    description:
      "Quiet tiled flat on the 5th floor with a lift, one room, a balcony, and an attached bath. Calm lane near Kallyanpur.",
    descriptionBn:
      "নভেম্বর-২০২৫ মাস হইতে টাইলসকৃত বাসায় ৫ম তলায় (লিফটের-৪) ১রুম, ১বেলকনি, এটাচ বাথরুম সহ নিরিবিলি পরিবেশ।",
    photos: ["/rooms/07.jpg", "/rooms/02.jpg", "/rooms/06.jpg"],
    rent: 8000,
    availableLabel: "6 October",
    availableISO: "2026-10-06",
    area: "Mirpur",
    neighborhood: "Kallyanpur",
    address: "227, South Paikpara, Bottola, Kallyanpur, Dhaka",
    types: "Sublet",
    phone: "01618005542",
  },
  {
    id: "farhan-uttara",
    name: "Farhan Ahmed",
    postedLabel: "Posted 1 day ago",
    description:
      "Airy sector flat with a separate desk, wardrobe, and a reserved parking spot. Suited to a single professional or a small office setup.",
    photos: ["/rooms/08.jpg", "/rooms/06.jpg", "/rooms/01.jpg"],
    rent: 11000,
    availableLabel: "12 October",
    availableISO: "2026-10-12",
    area: "Uttara",
    neighborhood: "Uttara Sector 7",
    address: "Sector 7, Uttara, Dhaka",
    types: "Office",
    phone: "01788006621",
  },
  {
    id: "nusrat-motijheel",
    name: "Nusrat Jahan",
    postedLabel: "Posted 4 days ago",
    description:
      "Simple city-center room near Motijheel offices. Shared kitchen, secure gate, and an easy walk to the bus stand.",
    photos: ["/rooms/08.jpg", "/rooms/04.jpg", "/rooms/05.jpg"],
    rent: 6500,
    availableLabel: "8 October",
    availableISO: "2026-10-08",
    area: "Motijheel",
    neighborhood: "Motijheel",
    address: "Arambagh, Motijheel, Dhaka",
    types: "Other",
    phone: "01999001208",
  },
];
