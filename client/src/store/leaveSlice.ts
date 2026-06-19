import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getLeaves } from "../api/leave.api";
import { LeaveRequest, LeaveFilters, PaginatedResponse } from "../types";

interface LeaveState {
  data: PaginatedResponse<LeaveRequest> | null;
  loading: boolean;
  filters: LeaveFilters;
}

const initialState: LeaveState = {
  data: null,
  loading: false,
  filters: {
    from_date: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0],
    to_date: new Date(new Date().getFullYear(), 11, 31)
      .toISOString()
      .split("T")[0],
    statuses: [],
    page: 1,
    limit: 15,
  },
};

export const fetchLeaves = createAsyncThunk(
  "leaves/fetch",
  async (filters: LeaveFilters) => {
    return await getLeaves(filters);
  },
);

const leaveSlice = createSlice({
  name: "leaves",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<LeaveFilters>) {
      state.filters = { ...action.payload };
    },
    resetFilters(state) {
      state.filters = { ...initialState.filters };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaves.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchLeaves.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setFilters, resetFilters } = leaveSlice.actions;
export default leaveSlice.reducer;
