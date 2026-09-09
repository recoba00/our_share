import { createContext } from "react";
import type { AuthContextValue } from "./types/authTypes";

export const AuthContext = createContext<AuthContextValue | null>(null);
