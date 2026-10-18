"use client";

import { useEffect, useState } from "react";

export const RECOMMENDATION_STORAGE_KEY = "user_recommendation_data";
const CHANGE_EVENT = "user-recommendation-data:change";

export type RecommendationData = {
    viewed_room_ids: string[];
    search_location: string;
    search_type: string;
    keywords: string[];
    user_detected_city: string;
};

const EMPTY_DATA: RecommendationData = {
    viewed_room_ids: [],
    search_location: "",
    search_type: "",
    keywords: [],
    user_detected_city: "",
};

const toStringArray = (value: unknown): string[] =>
    Array.isArray(value)
        ? Array.from(
            new Set(
                value
                    .filter((item): item is string => typeof item === "string")
                    .map((item) => item.trim())
                    .filter(Boolean),
            ),
        )
        : [];

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// Always returns an object with all five fields, even if storage is empty/corrupt.
function sanitize(raw: unknown): RecommendationData {
    const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
        viewed_room_ids: toStringArray(source.viewed_room_ids),
        search_location: toText(source.search_location),
        search_type: toText(source.search_type),
        keywords: ["wifi"],
        user_detected_city: toText(source.user_detected_city),
    };
}

export function readRecommendationData(): RecommendationData {
    if (typeof window === "undefined") return { ...EMPTY_DATA };
    try {
        const stored = window.localStorage.getItem(RECOMMENDATION_STORAGE_KEY);
        return sanitize(stored ? JSON.parse(stored) : null);
    } catch {
        return { ...EMPTY_DATA };
    }
}

// Merges a patch into the single stored object. Skips the write if nothing changed.
function updateRecommendationData(
    patch: (current: RecommendationData) => Partial<RecommendationData>,
) {
    if (typeof window === "undefined") return;
    const current = readRecommendationData();
    const next = sanitize({ ...current, ...patch(current) });
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    try {
        window.localStorage.setItem(RECOMMENDATION_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
        // storage full or blocked: ignore, app must keep working
    }
}

export function addViewedRoomId(roomId: string | undefined) {
    const id = roomId?.trim();
    if (!id) return;
    updateRecommendationData((current) =>
        current.viewed_room_ids.includes(id)
            ? {}
            : { viewed_room_ids: [...current.viewed_room_ids, id] },
    );
}

export function setSearchLocation(location: string) {
    const value = location.trim();
    if (!value) return;
    updateRecommendationData(() => ({ search_location: value }));
}

export function setSearchType(type: string) {
    const value = type.trim();
    if (!value) return;
    updateRecommendationData(() => ({ search_type: value }));
}

export function setSearchKeywords(keywords: string[]) {
    const value = toStringArray(keywords);
    if (value.length === 0) return;
    updateRecommendationData(() => ({ keywords: value }));
}

// ---- City detection: ipify (IP) -> ipwho.is (IP -> city) ----
let cityRequest: Promise<boolean> | null = null;

export function detectAndStoreUserCity(): Promise<boolean> {
    if (cityRequest) return cityRequest;
    cityRequest = (async () => {
        try {
            const ipUrl = process.env.NEXT_PUBLIC_IP_INFO_URL;
            if (!ipUrl) return false;

            const ipResponse = await fetch(ipUrl);
            if (!ipResponse.ok) return false;
            const { ip } = (await ipResponse.json()) as { ip?: unknown };
            if (typeof ip !== "string" || !ip) return false;




            const geoResponse = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
            if (!geoResponse.ok) return false;
            const geo = (await geoResponse.json()) as { success?: boolean; city?: unknown };
            const city = geo.success === false ? "" : toText(geo.city);


            if (!city) return false;

            updateRecommendationData(() => ({ user_detected_city: city }));
            return true;
        } catch {
            return false;
        }
    })().then((ok) => {
        if (!ok) cityRequest = null; // allow a retry later if it failed
        return ok;
    });
    return cityRequest;
}

// ---- React hook: keeps the UI in sync with localStorage ----
export function useRecommendationData(): RecommendationData {
    const [data, setData] = useState<RecommendationData>(EMPTY_DATA);

    useEffect(() => {
        const sync = () => setData(readRecommendationData());
        sync();
        window.addEventListener(CHANGE_EVENT, sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener(CHANGE_EVENT, sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    return data;
}