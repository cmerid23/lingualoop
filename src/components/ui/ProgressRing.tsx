interface ProgressRingProps {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}

/**
 * Pure-SVG circular progress ring. Used on the home screen to show today's
 * minute target. Keeps zero JS animation libs.
 */
export function ProgressRing({
  value,
  size = 140,
  stroke = 12,
  label,
  sublabel,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-brand-500 transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {label && <span className="text-2xl font-bold">{label}</span>}
        {sublabel && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
