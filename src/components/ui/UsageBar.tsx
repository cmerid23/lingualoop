import { isUnlimited, usageColor } from "../../lib/usage";

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  icon?: string;
}

const TOKENS = {
  teal: { fill: "var(--teal)", text: "text-teal-dark" },
  gold: { fill: "var(--gold)", text: "text-gold" },
  coral: { fill: "var(--coral)", text: "text-coral" },
};

export function UsageBar({ label, used, limit, icon }: UsageBarProps) {
  const accent = usageColor(used, limit);
  const tone = TOKENS[accent];
  const unlimited = isUnlimited(limit);
  const remaining = unlimited ? -1 : Math.max(0, limit - used);
  const exhausted = !unlimited && remaining === 0;
  const pct = unlimited ? 100 : Math.min(100, (used / limit) * 100);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-ink">
          {icon && <span className="text-sm">{icon}</span>}
          {label}
        </span>
        <span className={`font-semibold ${tone.text}`}>
          {unlimited
            ? "∞ Unlimited"
            : exhausted
              ? "Limit reached"
              : `${remaining} left`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: tone.fill }}
          />
        </div>
      )}
    </div>
  );
}
