import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getEmployees, deleteEmployee as deleteEmployeeApi } from '../api/employee.api';
import { Employee, PaginatedResponse } from '../types';

interface EmployeeState {
  data: PaginatedResponse<Employee> | null;
  loading: boolean;
  page: number;
}

const initialState: EmployeeState = {
  data: null,
  loading: false,
  page: 1,
};

export const fetchEmployees = createAsyncThunk(
  'employees/fetch',
  async (page: number) => {
    const res = await getEmployees(page);
    return res.data;
  }
);

export const removeEmployee = createAsyncThunk(
  'employees/delete',
  async (id: number) => {
    await deleteEmployeeApi(id);
    return id;
  }
);

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => { state.loading = true; })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state) => { state.loading = false; })
      .addCase(removeEmployee.fulfilled, (state, action) => {
        if (state.data) {
          state.data.data = state.data.data.filter(e => e.id !== action.payload);
          state.data.total -= 1;
        }
      });
  },
});

export const { setPage } = employeeSlice.actions;
export default employeeSlice.reducer;
