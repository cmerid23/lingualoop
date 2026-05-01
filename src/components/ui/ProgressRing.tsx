interface ProgressRingProps {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}

/**
 * Pure-SVG circular progress ring. Gold accent on a warm surface track.
 */
export function ProgressRing({
  value,
  size = 90,
  stroke = 10,
  label,
  sublabel,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--surface-2)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--gold)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        {label && (
          <span className="font-display text-xl font-bold leading-none text-ink">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="mt-1 text-[10px] font-medium text-ink-3/60">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
