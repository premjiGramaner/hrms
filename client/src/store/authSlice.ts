import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem('hrms_token'),
  user: (() => {
    const s = localStorage.getItem('hrms_user');
    return s ? JSON.parse(s) : null;
  })(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('hrms_token', action.payload.token);
      localStorage.setItem('hrms_user', JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('hrms_user');
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
