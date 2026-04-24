"use client";

import { useCallback, useRef, useState } from "react";

type Variant = "company" | "member" | "home";

type Props = {
  variant: Variant;
  children: React.ReactNode;
};

export default function DashboardShell({ variant, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef({ x: 50, y: 45 });
  const [spot, setSpot] = useState({ x: 50, y: 45 });
  const [mood, setMood] = useState(48);

  const flushSpot = useCallback(() => {
    rafRef.current = null;
    setSpot({ ...pendingRef.current });
  }, []);

  const updateSpot = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      pendingRef.current = {
        x: Math.min(100, Math.max(0, ((clientX - r.left) / w) * 100)),
        y: Math.min(100, Math.max(0, ((clientY - r.top) / h) * 100)),
      };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushSpot);
      }
    },
    [flushSpot],
  );

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateSpot(e.clientX, e.clientY);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (t) updateSpot(t.clientX, t.clientY);
  };

  const onMouseLeave = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingRef.current = { x: 50, y: 42 };
    setSpot({ x: 50, y: 42 });
  };

  const { x: mx, y: my } = spot;
  const hueShift = (mood - 50) * 2.2;

  const baseLayer: React.CSSProperties =
    variant === "company"
      ? {
          background: "linear-gradient(165deg, #020617 0%, #0f172a 38%, #022c22 55%, #020617 100%)",
        }
      : variant === "member"
        ? {
            background: "linear-gradient(165deg, #020617 0%, #1e1b4b 42%, #0f172a 58%, #020617 100%)",
          }
        : {
            background:
              "linear-gradient(165deg, #020617 0%, #0f172a 26%, #1e1b4b 48%, #022c22 70%, #020617 100%)",
          };

  const glowLayer: React.CSSProperties =
    variant === "company"
      ? {
          background: `
          radial-gradient(ellipse 95% 75% at ${mx}% ${my}%, rgba(16, 185, 129, 0.42), transparent 55%),
          radial-gradient(ellipse 70% 60% at ${100 - mx * 0.75}% ${100 - my * 0.65}%, rgba(34, 211, 238, 0.22), transparent 52%),
          radial-gradient(ellipse 85% 55% at 50% 100%, rgba(5, 150, 105, 0.18), transparent 50%)
        `,
          filter: `hue-rotate(${hueShift}deg) saturate(1.15)`,
          transition: "filter 0.35s ease-out",
        }
      : variant === "member"
        ? {
            background: `
          radial-gradient(ellipse 95% 75% at ${mx}% ${my}%, rgba(129, 140, 248, 0.4), transparent 55%),
          radial-gradient(ellipse 70% 60% at ${100 - mx * 0.75}% ${100 - my * 0.65}%, rgba(217, 70, 239, 0.2), transparent 52%),
          radial-gradient(ellipse 85% 50% at 50% 0%, rgba(99, 102, 241, 0.16), transparent 48%)
        `,
            filter: `hue-rotate(${hueShift}deg) saturate(1.12)`,
            transition: "filter 0.35s ease-out",
          }
        : {
            background: `
          radial-gradient(ellipse 95% 78% at ${mx}% ${my}%, rgba(99, 102, 241, 0.38), transparent 55%),
          radial-gradient(ellipse 72% 62% at ${100 - mx * 0.72}% ${100 - my * 0.62}%, rgba(45, 212, 191, 0.24), transparent 52%),
          radial-gradient(ellipse 88% 48% at 18% 12%, rgba(167, 139, 250, 0.16), transparent 50%)
        `,
            filter: `hue-rotate(${hueShift}deg) saturate(1.14)`,
            transition: "filter 0.35s ease-out",
          };

  const rangeAccent =
    variant === "company"
      ? "accent-teal-400 [--tw-ring-color:theme(colors.teal.400/0.35)]"
      : variant === "member"
        ? "accent-violet-400 [--tw-ring-color:theme(colors.violet.400/0.35)]"
        : "accent-indigo-400 [--tw-ring-color:theme(colors.indigo.400/0.35)]";

  const minHeightClass =
    variant === "home" ? "min-h-[calc(100vh-8rem)]" : "min-h-[calc(100vh-6rem)]";

  const innerPad =
    variant === "home"
      ? "relative z-10 px-4 pb-36 pt-10 sm:px-6 sm:pt-14"
      : "relative z-10 px-4 pb-36 pt-8 sm:px-6";

  const footerHint =
    variant === "home"
      ? "Move the mouse over the page — the glow follows your cursor. Use the slider to shift the colour mood."
      : "Move the mouse or hover with the trackpad — the glow follows you. Use the slider below to adjust colour mood.";

  return (
    <div
      ref={wrapRef}
      className={`relative isolate ${minHeightClass} overflow-x-hidden touch-pan-y`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20" style={baseLayer} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 will-change-[filter]"
        style={glowLayer}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] mix-blend-soft-light"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 0%, transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.04) 0%, transparent 40%)`,
        }}
      />

      <div className={innerPad}>{children}</div>

      <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-slate-950/75 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/65">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6">
          <p className="max-w-md text-[11px] leading-relaxed text-white/65 sm:text-xs">
            <span className="font-semibold text-white/85">Interactive background:</span> {footerHint}
          </p>
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[280px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Colour mood</span>
              <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/50">{mood}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 shadow-inner ring-1 ring-white/10 transition ${rangeAccent} [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white`}
              aria-label="Page colour mood"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
