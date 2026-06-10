import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthUser } from '../types';
import { STORAGE_KEYS } from '../constants/storage';
import { readJson, writeJson } from '../utils/storage';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem(STORAGE_KEYS.token),
  user: readJson<AuthUser>(STORAGE_KEYS.user),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem(STORAGE_KEYS.token, action.payload.token);
      writeJson(STORAGE_KEYS.user, action.payload.user);
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
