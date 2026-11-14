import { Check, TriangleAlert, Unplug } from "lucide-react";
import type { SensorQuality } from "./health-data";

function SensorQualityBadge({ status }: { status: SensorQuality }) {
  const Icon =
    status === "Usable" ? Check : status === "Poor contact" ? TriangleAlert : Unplug;

  return (
    <span className={`reading-status-word ${status.toLowerCase().replace(" ", "-")}`}>
      <Icon size={13} />
      {status}
    </span>
  );
}

export { SensorQualityBadge };
