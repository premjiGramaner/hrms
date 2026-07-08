import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthUser, UpdateUserNamePayload } from "../types";
import { STORAGE_KEYS } from "../constants/storage";
import { readJson, writeJson } from "../utils/storage";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem(STORAGE_KEYS.token),
  user: readJson<AuthUser>(STORAGE_KEYS.user),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess(
      state,
      action: PayloadAction<{ token: string; user: AuthUser }>,
    ) {
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
      // Cookie will be cleared by the server
    },
    updateUserAvatar(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user = { ...state.user, avatar: action.payload };
        writeJson(STORAGE_KEYS.user, state.user);
      }
    },
    updateUserName(state, action: PayloadAction<UpdateUserNamePayload>) {
      if (state.user) {
        const firstName = action.payload.first_name ?? state.user.first_name;
        const lastName = action.payload.last_name ?? state.user.last_name;
        const fullName =
          action.payload.name ||
          (firstName && lastName
            ? `${firstName} ${lastName}`.trim()
            : firstName || lastName || state.user.name);

        state.user = {
          ...state.user,
          name: fullName,
          first_name: firstName,
          last_name: lastName,
        };
        writeJson(STORAGE_KEYS.user, state.user);
      }
    },
  },
});

export const { loginSuccess, logout, updateUserAvatar, updateUserName } =
  authSlice.actions;
export default authSlice.reducer;
