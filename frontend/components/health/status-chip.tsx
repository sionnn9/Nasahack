import {
  AlertTriangle,
  CircleDashed,
  CircleHelp,
  CircleCheck,
  CircleDot,
} from "lucide-react";
import type { Comparison } from "@/lib/types";

const icons = {
  logged: CircleDot,
  attention: AlertTriangle,
  no_valid_reading: CircleDashed,
  within_range: CircleCheck,
  insufficient_history: CircleHelp,
} as const;

/** Status is never colour alone: every state ships an icon and text. */
export function StatusChip({
  comparison,
  compact = false,
}: {
  comparison: Comparison;
  compact?: boolean;
}) {
  const Icon = icons[comparison.state];
  return (
    <span
      className={`comparison-chip status-${comparison.state} ${compact ? "compact" : ""}`}
      title={comparison.detail}
    >
      <Icon aria-hidden="true" />
      <span>{comparison.label}</span>
    </span>
  );
}

export function LaneBadge({ lane }: { lane: "manual" | "live" | "replay" | "synthetic" }) {
  const labels = {
    manual: "Manual",
    live: "Live",
    replay: "Replay",
    synthetic: "Synthetic",
  } as const;
  return <span className={`lane-badge lane-${lane}`}>{labels[lane]}</span>;
}
