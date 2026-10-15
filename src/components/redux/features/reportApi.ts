import { baseApi } from "../api/baseApi";

export type RoomReportResponse = {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    message?: string;
    data?: {
      id: string;
      userId: string;
      roomId: string;
      reportType: string;
      isDeleted: boolean;
    };
  };
};

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    recoredReport: builder.mutation<
      RoomReportResponse,
      { roomId: string; reportType: string, ipAddress?: string }
    >({
      query: (report) => ({
        url: "/report_room/",
        method: "POST",
        body: report,
      }),
      invalidatesTags: ["auth"],
    }),
  }),
});
export const { useRecoredReportMutation } = reportApi;