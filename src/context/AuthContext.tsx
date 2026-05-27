"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { MockUser } from "@/lib/types";

const MOCK_USER: MockUser = {
  id: "mock-001",
  name: "Brother James R. Thornton",
  email: "james@gulfcoastroofing.com",
  lodge: "Gulf Coast Lodge",
  lodgeNumber: 441,
  location: "Tampa, FL",
  verified: true,
  listingSlug: "gulf-coast-roofing",
};

interface AuthContextValue {
  user: MockUser | null;
  isLoggedIn: boolean;
  toggleAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  toggleAuth: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <AuthContext.Provider
      value={{
        user: isLoggedIn ? MOCK_USER : null,
        isLoggedIn,
        toggleAuth: () => setIsLoggedIn((v) => !v),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
