import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import employeeReducer from './employeeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
