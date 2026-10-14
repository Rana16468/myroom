import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { TOKEN_NAME } from "@/utility/authToken";

const baseQuery = fetchBaseQuery({
  baseUrl: "/api/backend",
  prepareHeaders: (headers) => {
    let token: string | null = null;
    if (typeof window !== "undefined") {
      try {
        token = localStorage.getItem(TOKEN_NAME);
      } catch (error) {
        console.error("Could not read the access token for the API request:", error);
      }
    }

    if (token) {
      headers.set("Authorization", `${token}`);
    }

    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery,
  tagTypes: ["post", "auth", "roomList", "saveRoom"],
  endpoints: () => ({}),
});
