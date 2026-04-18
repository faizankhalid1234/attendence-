"use client";

import { useTheme, type ThemeMode } from "@/app/providers";

const modes: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Auto" },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      className="inline-flex rounded-full border border-slate-200/90 bg-white/90 p-1 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90"
      role="group"
      aria-label="Theme"
    >
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            mode === m.id
              ? "bg-indigo-600 text-white shadow dark:bg-indigo-500"
              : "text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
