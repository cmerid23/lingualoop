import { useMemo, type CSSProperties } from "react";

const COLORS = [
  "#C8973A", // gold
  "#F0C96B", // gold-light
  "#2EC4B6", // teal
  "#7C3AED", // violet
  "#FF6B6B", // coral
  "#22C55E", // green
];

/**
 * One-shot confetti shower. Each piece gets a random horizontal position,
 * colour, size, duration, and delay so the burst feels organic. Animation
 * is `confetti-fall` defined in tailwind.config.ts; pieces fade as they fall
 * past the viewport and stop holding paint via CSS `forwards`.
 */
export function Confetti({ count = 48 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        duration: 2.6 + Math.random() * 2.2,
        delay: Math.random() * 0.6,
        size: 6 + Math.random() * 6,
      })),
    [count],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => {
        const style: CSSProperties = {
          left: `${p.left}%`,
          top: -10,
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: 2,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        };
        return (
          <span
            key={p.id}
            className="absolute animate-confetti-fall"
            style={style}
          />
        );
      })}
    </div>
  );
}
