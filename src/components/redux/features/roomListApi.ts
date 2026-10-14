import { baseApi } from "../api/baseApi";

export type SpecificRoomDetails = {
    id: string;
    address: string;
    area: string;
    types: string;
    description: string;
    neighborhood: string;
    viewCount: number;
    photos: string[];
    createdAt: string;
    updatedAt: string;
};

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

type DeleteRoomResponse = {
    success: boolean;
    message: string;
};

export type PublicRoomListing = {
    id: string;
    address: string;
    area: string;
    types: string;
    description: string;
    neighborhood: string;
    photos: string[];
    viewCount?: number;
    createdAt?: string;
    name?: string;
    phone?: string;
    rent?: number;
    availableISO?: string;
    user?: { name?: string; phone?: string };
};

type PublicRoomListResponse = {
    success: boolean;
    message: string;
    data: {
        meta: {
            page: number;
            limit: number;
            totalCount: number;
            totalPages: number;
        };
        data: PublicRoomListing[];
    };
};

export const roomListApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        myRoomList: builder.query({
            query: (params) => ({
                url: "/room_list/my-listings",
                method: "GET",
                params

            }),
            providesTags: ['roomList']
        }),
        createListing: builder.mutation({

            query: (formData) => {
                return {
                    url: "/room_list/",
                    method: "POST",
                    body: formData
                }
            },
            invalidatesTags: ['roomList']

        }),
        specificRoomList: builder.query<ApiResponse<SpecificRoomDetails>, { id: string }>({
            query: ({ id }) => {
                return {
                    url: `/room_list/${encodeURIComponent(id)}`,
                    method: "GET"
                }
            },
            providesTags: (_result, _error, { id }) => [{ type: 'roomList', id }]
        }),
        updateRoomList: builder.mutation<ApiResponse<SpecificRoomDetails>, { id: string; data: FormData }>({
            query: ({ id, data }) => {
                return {
                    url: `/room_list/${encodeURIComponent(id)}`,
                    method: "PATCH",
                    body: data
                }
            },
            invalidatesTags: (_result, _error, { id }) => ['roomList', { type: 'roomList', id }]

        }),

        getAllRoomList: builder.query<PublicRoomListResponse, Record<string, string | number>>({
            query: (params) => ({
                url: "/room_list/",
                method: "GET",
                params
            }),
            providesTags: ["roomList"]

        }),


        deleteRoomList: builder.mutation<DeleteRoomResponse, string>({
            query: (id) => {

                return {
                    url: `/room_list/${encodeURIComponent(id)}`,
                    method: "DELETE"
                }

            },
            invalidatesTags: ["roomList"]
        }),
        viewCount: builder.mutation<
            unknown,
            { roomId: string; ipAddress: string; eventId?: string }
        >({
            query: ({ eventId, ...data }) => ({
                url: "/room_list/view_count",
                method: "POST",
                body: data,
                ...(eventId ? { headers: { "Idempotency-Key": eventId } } : {})
            }),
        })



    }),
});
export const { useMyRoomListQuery,
    useCreateListingMutation,
    useSpecificRoomListQuery,
    useUpdateRoomListMutation,
    useDeleteRoomListMutation,
    useGetAllRoomListQuery,
    useLazyGetAllRoomListQuery,
    useViewCountMutation
} = roomListApi;