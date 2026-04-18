"use client";

import { useEffect } from "react";

/** Registers the pass-through service worker in production so the app can be installed as a PWA. */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* ignore registration errors (e.g. HTTP on some browsers) */
    });
  }, []);

  return null;
}
