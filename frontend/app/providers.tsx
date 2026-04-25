"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

/** Keeps the app on a single light layout (no theme switcher). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return <>{children}</>;
}
