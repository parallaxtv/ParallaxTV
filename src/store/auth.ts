import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthData {
  userId: string;
  serverUrl: string;
  token: string;
  username: string;
}

interface AuthStore {
  authData: AuthData | null;

  setAuthData: (data: AuthData | null) => void;

  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      authData: null,

      setAuthData: (data) =>
        set({
          authData: data,
        }),

      logout: () =>
        set({
          authData: null,
        }),
    }),
    {
      name: "parallax-auth",
    }
  )
);