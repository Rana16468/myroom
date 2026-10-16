import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { baseApi } from "@/components/redux/api/baseApi";
import {
  LISTING_TYPES,
  RENT_MAX,
  SEED_LISTINGS,
  type Listing,
  type ListingType,
} from "@/data/rooms";

export type SessionUser = {
  name: string;
  phone: string;
  email?: string;
};

export type AccountStep = "closed" | "login" | "create" | "complete";

type ListingsState = {
  seed: Listing[];
  userListings: Listing[];
};

type FiltersState = {
  query: string;
  area: string | null;
  nearby: boolean;
  types: ListingType[];
  maxRent: number;
  availableFrom: string;
};

type SessionState = {
  user: SessionUser | null;
  step: AccountStep;
  draftName: string;
  draftPhone: string;
};

type UiState = {
  savedIds: string[];
  reportedIds: string[];
  filterOpen: boolean;
  callId: string | null;
  reportId: string | null;
  toast: string | null;
};

const listingsSlice = createSlice({
  name: "listings",
  initialState: { seed: SEED_LISTINGS, userListings: [] } as ListingsState,
  reducers: {
    addListing(state, action: PayloadAction<Listing>) {
      state.userListings.unshift(action.payload);
    },
    updateListing(state, action: PayloadAction<Listing>) {
      const index = state.userListings.findIndex((listing) => listing.id === action.payload.id);
      if (index !== -1) state.userListings[index] = action.payload;
    },
    replaceUserListings(state, action: PayloadAction<Listing[]>) {
      state.userListings = action.payload;
    },
  },
});

const filtersSlice = createSlice({
  name: "filters",
  initialState: {
    query: "",
    area: null,
    nearby: false,
    types: [],
    maxRent: RENT_MAX,
    availableFrom: "",
  } as FiltersState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setArea(state, action: PayloadAction<string | null>) {
      state.area = state.area === action.payload ? null : action.payload;
      if (state.area) state.nearby = false;
    },
    chooseArea(state, action: PayloadAction<string>) {
      state.area = action.payload;
      state.nearby = false;
    },
    toggleNearby(state) {
      state.nearby = !state.nearby;
      if (state.nearby) state.area = null;
    },
    toggleType(state, action: PayloadAction<ListingType>) {
      const type = action.payload;
      state.types = state.types.includes(type)
        ? state.types.filter((item) => item !== type)
        : [...state.types, type];
    },
    clearTypes(state) {
      state.types = [];
    },
    applyRentAndDate(state, action: PayloadAction<{ maxRent: number; availableFrom: string }>) {
      state.maxRent = action.payload.maxRent;
      state.availableFrom = action.payload.availableFrom;
    },
    resetFilters(state) {
      state.query = "";
      state.area = null;
      state.nearby = false;
      state.types = [];
      state.maxRent = RENT_MAX;
      state.availableFrom = "";
    },
  },
});

const sessionSlice = createSlice({
  name: "session",
  initialState: {
    user: null,
    step: "closed",
    draftName: "",
    draftPhone: "",
  } as SessionState,
  reducers: {
    openAccount(state) {
      state.step = state.user ? "closed" : "login";
    },
    closeAccount(state) {
      state.step = "closed";
    },
    showLogin(state) {
      state.step = "login";
      state.draftName = state.draftName || "";
    },
    showCreate(state) {
      state.step = "create";
    },
    continueWithGoogle(state) {
      state.draftName = "Reza Matiqul Rashed";
      state.draftPhone = "";
      state.step = "complete";
    },
    setDraftName(state, action: PayloadAction<string>) {
      state.draftName = action.payload;
    },
    setDraftPhone(state, action: PayloadAction<string>) {
      state.draftPhone = action.payload.replace(/[^\d]/g, "").slice(0, 11);
    },
    completeSetup(state) {
      const name = state.draftName.trim();
      const phone = state.draftPhone.trim();
      if (!name || phone.length < 11) return;
      state.user = { name, phone };
      state.step = "closed";
    },
    loginWithPhone(state) {
      const name = state.draftName.trim() || "Reza Matiqul Rashed";
      const phone = state.draftPhone.trim();
      if (phone.length < 11) return;
      state.user = { name, phone };
      state.step = "closed";
    },
    logout(state) {
      state.user = null;
      state.step = "closed";
      state.draftName = "";
      state.draftPhone = "";
    },
    restoreUser(state, action: PayloadAction<SessionUser | null>) {
      state.user = action.payload;
    },
    authenticateUser(state, action: PayloadAction<SessionUser>) {
      state.user = action.payload;
      state.draftName = action.payload.name;
      state.draftPhone = action.payload.phone;
      state.step = "closed";
    },
  },
});

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    savedIds: [],
    reportedIds: [],
    filterOpen: false,
    callId: null,
    reportId: null,
    toast: null,
  } as UiState,
  reducers: {
    toggleSaved(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.savedIds = state.savedIds.includes(id)
        ? state.savedIds.filter((item) => item !== id)
        : [...state.savedIds, id];
    },
    replaceSaved(state, action: PayloadAction<string[]>) {
      state.savedIds = action.payload;
    },
    replaceReported(state, action: PayloadAction<string[]>) {
      state.reportedIds = action.payload;
    },
    setFilterOpen(state, action: PayloadAction<boolean>) {
      state.filterOpen = action.payload;
    },
    setCallId(state, action: PayloadAction<string | null>) {
      state.callId = action.payload;
    },
    setReportId(state, action: PayloadAction<string | null>) {
      state.reportId = action.payload;
    },
    reportListing(state, action: PayloadAction<string>) {
      if (!state.reportedIds.includes(action.payload)) state.reportedIds.push(action.payload);
      state.reportId = null;
      state.toast = "Thanks — we’ll review this listing.";
    },
    showToast(state, action: PayloadAction<string | null>) {
      state.toast = action.payload;
    },
  },
});

export const { addListing, updateListing, replaceUserListings } = listingsSlice.actions;
export const {
  setQuery,
  setArea,
  chooseArea,
  toggleNearby,
  toggleType,
  clearTypes,
  applyRentAndDate,
  resetFilters,
} = filtersSlice.actions;
export const {
  openAccount,
  closeAccount,
  showLogin,
  showCreate,
  continueWithGoogle,
  setDraftName,
  setDraftPhone,
  completeSetup,
  loginWithPhone,
  logout,
  restoreUser,
  authenticateUser,
} = sessionSlice.actions;
export const {
  toggleSaved,
  replaceSaved,
  replaceReported,
  setFilterOpen,
  setCallId,
  setReportId,
  reportListing,
  showToast,
} = uiSlice.actions;

export const store = configureStore({
  reducer: {
    listings: listingsSlice.reducer,
    filters: filtersSlice.reducer,
    session: sessionSlice.reducer,
    ui: uiSlice.reducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export function normalizeListing(value: unknown): Listing | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const typeValues = Array.isArray(item.types) ? item.types : [item.types];
  const type = typeValues.find(
    (candidate): candidate is ListingType =>
      typeof candidate === "string" && LISTING_TYPES.some((knownType) => knownType === candidate),
  );
  const area = typeof item.locationPath === "string" ? item.locationPath : item.area;

  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.description !== "string" ||
    typeof item.address !== "string" ||
    typeof item.phone !== "string" ||
    typeof area !== "string" ||
    typeof item.neighborhood !== "string" ||
    !Array.isArray(item.photos) ||
    !item.photos.every((photo) => typeof photo === "string") ||
    !type
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    ...(typeof item.descriptionBn === "string" ? { descriptionBn: item.descriptionBn } : {}),
    photos: item.photos,
    area,
    neighborhood: item.neighborhood,
    address: item.address,
    types: type,
    phone: item.phone,
  };
}

export { LISTING_TYPES };
