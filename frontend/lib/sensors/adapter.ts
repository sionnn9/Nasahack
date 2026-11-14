import type { Observation, Quality } from "@/lib/types";

/**
 * Live-sensor seam. A backend or Bluetooth device can replace the simulator
 * without touching the UI: implement this interface and pass it in.
 */
export interface SensorAdapter {
  readonly name: string;
  readonly available: boolean;
  connect(): Promise<void>;
  disconnect(): void;
  onSample(listener: (sample: Observation) => void): () => void;
  onQuality(listener: (quality: Quality) => void): () => void;
}

export class SimulatedAdapter implements SensorAdapter {
  readonly name = "Simulated sensor";
  readonly available = true;
  private samples = new Set<(sample: Observation) => void>();
  private quality = new Set<(quality: Quality) => void>();
  private timer: number | null = null;

  async connect() {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      for (const listener of this.quality) listener("ok");
    }, 10_000);
  }

  disconnect() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.samples.clear();
    this.quality.clear();
  }

  onSample(listener: (sample: Observation) => void) {
    this.samples.add(listener);
    return () => this.samples.delete(listener);
  }

  onQuality(listener: (quality: Quality) => void) {
    this.quality.add(listener);
    return () => this.quality.delete(listener);
  }
}

/** Web Serial pulse sensor placeholder. Kept honest: it does nothing yet. */
export class WebSerialAdapter implements SensorAdapter {
  readonly name = "Web Serial pulse sensor";
  readonly available =
    typeof navigator !== "undefined" && "serial" in (navigator as Navigator);

  async connect() {
    if (!this.available) {
      throw new Error(
        "Web Serial is not available in this browser. Use the simulated sensor for the demo.",
      );
    }
    throw new Error(
      "Web Serial support is a stub in this demo. No device protocol is implemented yet.",
    );
  }

  disconnect() {}

  onSample() {
    return () => undefined;
  }

  onQuality() {
    return () => undefined;
  }
}
