import type {
  EnvironmentKey,
  LinkState,
  Observation,
  OutboxItem,
  OutboxState,
} from "@/lib/types";
import type { SensorAdapter } from "@/lib/sensors/adapter";

/**
 * Optional HTTP transport. When NEXT_PUBLIC_API_URL is unset every export here
 * is inert and the app keeps behaving exactly as the offline demo.
 */
export const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const apiConfigured = apiBase.length > 0;

const crewKey = process.env.NEXT_PUBLIC_CREW_KEY ?? "";
const groundKey = process.env.NEXT_PUBLIC_GROUND_KEY ?? "";

export type ServerPacket = {
  id: string;
  crewId: string;
  kind: string;
  title: string;
  payload: Record<string, unknown>;
  private: boolean;
  includePrivate: boolean;
  state: OutboxState;
  createdAt: string;
  sentAt: string | null;
  visibleAt: string | null;
  deliveredAt: string | null;
  ackAt: string | null;
  ackVisibleAt: string | null;
  delaySeconds: number;
  history: Array<{ state: OutboxState; at: string; note: string }>;
};

export type ApiFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
};

export type ApiResult<T> = ({ ok: true } & T) | ApiFailure;

async function request<T>(
  path: string,
  init: RequestInit = {},
  key: string = crewKey,
): Promise<ApiResult<T>> {
  if (!apiConfigured) {
    return { ok: false, code: "NOT_CONFIGURED", message: "No API URL configured.", status: 0 };
  }
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    const body: unknown = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = (body as { error?: { code?: string; message?: string } }).error;
      return {
        ok: false,
        code: error?.code ?? "HTTP_ERROR",
        message: error?.message ?? `Request failed with ${response.status}.`,
        status: response.status,
      };
    }
    return { ok: true, ...(body as T) };
  } catch (error) {
    return {
      ok: false,
      code: "UNREACHABLE",
      message: error instanceof Error ? error.message : "Server unreachable.",
      status: 0,
    };
  }
}

export function packetToOutbox(packet: ServerPacket): OutboxItem {
  return {
    id: packet.id,
    crewId: packet.crewId,
    kind: packet.kind as OutboxItem["kind"],
    createdAt: packet.createdAt,
    sentAt: packet.sentAt,
    acknowledgedAt: packet.ackAt,
    state: packet.state,
    delaySeconds: packet.delaySeconds,
    title: packet.title,
    payload: packet.payload as OutboxItem["payload"],
    private: packet.private,
    history: packet.history.map((entry) => ({
      state: entry.state,
      at: entry.at,
      note: entry.note,
    })),
  };
}

export async function pingServer() {
  return request<{ ok: boolean; time: string; link: LinkView }>("/health", {}, "");
}

export type LinkView = {
  state: LinkState;
  environment: EnvironmentKey;
  scenarioDelaySeconds: number;
  effectiveDelaySeconds: number;
  delayScale: number;
};

export async function fetchLink() {
  return request<{ link: LinkView; serverTime: string }>("/v1/link");
}

export async function sendLink(state: LinkState, environment: EnvironmentKey) {
  return request<{ link: LinkView; serverTime: string }>("/v1/link", {
    method: "PUT",
    body: JSON.stringify({ state, environment }),
  });
}

export async function postPacket(item: OutboxItem) {
  const payload = item.payload as { includePrivate?: boolean } | null;
  return request<{ packet: ServerPacket; serverTime: string; created: boolean }>("/v1/packets", {
    method: "POST",
    body: JSON.stringify({
      ...item,
      includePrivate: payload?.includePrivate ?? false,
    }),
  });
}

export async function fetchPackets(crewId: string) {
  return request<{ packets: ServerPacket[]; serverTime: string }>(
    `/v1/packets?crewId=${encodeURIComponent(crewId)}`,
  );
}

export async function fetchPacket(id: string, crewId: string) {
  return request<{ packet: ServerPacket; serverTime: string }>(
    `/v1/packets/${encodeURIComponent(id)}?crewId=${encodeURIComponent(crewId)}`,
  );
}

export async function fetchSurgeonInbox() {
  return request<{ packets: ServerPacket[]; serverTime: string }>(
    "/v1/surgeon/inbox",
    {},
    groundKey,
  );
}

export async function acknowledgeOnServer(id: string) {
  return request<{ packet: ServerPacket; serverTime: string }>(
    `/v1/surgeon/packets/${encodeURIComponent(id)}/ack`,
    { method: "POST", body: "{}" },
    groundKey,
  );
}

export type StreamHandlers = {
  onDelivered?: (packet: ServerPacket) => void;
  onAcknowledged?: (packet: ServerPacket) => void;
  onSample?: (observation: Observation) => void;
  onLink?: (link: LinkView) => void;
  onError?: () => void;
};

/** Same-origin replay of the server stream. Returns a disconnect function. */
export function connectStream(handlers: StreamHandlers): () => void {
  if (!apiConfigured || typeof EventSource === "undefined") return () => undefined;
  const source = new EventSource(
    `${apiBase}/v1/stream?token=${encodeURIComponent(crewKey)}`,
  );
  const parse = (event: MessageEvent) => JSON.parse(event.data) as unknown;

  source.addEventListener("packet.delivered", (event) => {
    handlers.onDelivered?.(parse(event as MessageEvent) as ServerPacket);
  });
  source.addEventListener("packet.acknowledged", (event) => {
    handlers.onAcknowledged?.(parse(event as MessageEvent) as ServerPacket);
  });
  source.addEventListener("sample", (event) => {
    handlers.onSample?.(parse(event as MessageEvent) as Observation);
  });
  source.addEventListener("link.changed", (event) => {
    handlers.onLink?.(parse(event as MessageEvent) as LinkView);
  });
  source.onerror = () => handlers.onError?.();
  return () => source.close();
}

/**
 * Device stream behind the same SensorAdapter interface. The server decides
 * quality; this adapter only forwards samples.
 */
export class RemoteSensorAdapter implements SensorAdapter {
  readonly name = "Remote sensor (server SSE)";
  readonly available = apiConfigured;
  private disconnectStream: (() => void) | null = null;
  private sampleListeners = new Set<(sample: Observation) => void>();
  private qualityListeners = new Set<(quality: Observation["quality"]) => void>();

  async connect() {
    if (!apiConfigured) {
      throw new Error("Set NEXT_PUBLIC_API_URL to use the remote sensor.");
    }
    this.disconnectStream = connectStream({
      onSample: (sample) => {
        for (const listener of this.sampleListeners) listener(sample);
        for (const listener of this.qualityListeners) listener(sample.quality);
      },
      onError: () => {
        for (const listener of this.qualityListeners) listener("no_contact");
      },
    });
  }

  disconnect() {
    this.disconnectStream?.();
    this.disconnectStream = null;
    this.sampleListeners.clear();
    this.qualityListeners.clear();
  }

  onSample(listener: (sample: Observation) => void) {
    this.sampleListeners.add(listener);
    return () => {
      this.sampleListeners.delete(listener);
    };
  }

  onQuality(listener: (quality: Observation["quality"]) => void) {
    this.qualityListeners.add(listener);
    return () => {
      this.qualityListeners.delete(listener);
    };
  }
}
