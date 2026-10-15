import api from "./axios";
import {
  Holiday,
  HolidayFilters,
  UploadHolidayResponse,
} from "../types/holiday.types";

export const getHolidayMatrix = async (
  filters: HolidayFilters = {},
): Promise<Holiday[]> => {
  const res = await api.get<{ success: boolean; data: Holiday[] }>(
    "/holidays/matrix",
    {
      params: filters,
    },
  );
  return res.data.data;
};

export const uploadHolidayMatrixPdf = async (
  file: File,
): Promise<UploadHolidayResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<UploadHolidayResponse>(
    "/holidays/upload-pdf",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return res.data;
};
