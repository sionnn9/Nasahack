import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server.js";
import { loadConfig } from "../src/config.js";
import { scopeEvent } from "../src/routes/stream.js";
import type { SseEvent } from "../src/context.js";
import type { Role } from "../src/types.js";

const packet = (crewId: string, isPrivate = false): SseEvent => ({
  type: "packet.delivered",
  data: { id: `p-${crewId}`, crewId, private: isPrivate },
});

const sample = (crewId: string): SseEvent => ({
  type: "sample",
  data: { id: `s-${crewId}`, crewId, metric: "heart_rate", value: 70 },
});

function visible(event: SseEvent, role: Role, crewId: string | null) {
  return scopeEvent(event, role, crewId);
}

describe("stream scoping", () => {
  it("shows a crew member only their own packets and samples", () => {
    expect(visible(packet("alex-morgan", true), "crew", "alex-morgan")).not.toBeNull();
    expect(visible(packet("alex-morgan"), "crew", "kenji-sato")).toBeNull();
    expect(visible(sample("alex-morgan"), "crew", "alex-morgan")).not.toBeNull();
    expect(visible(sample("alex-morgan"), "crew", "kenji-sato")).toBeNull();
  });

  it("shows the ground console packet events but no samples and no private packets", () => {
    expect(visible(packet("alex-morgan", false), "ground", null)).not.toBeNull();
    expect(visible(packet("alex-morgan", true), "ground", null)).toBeNull();
    expect(visible(sample("alex-morgan"), "ground", null)).toBeNull();
  });

  it("sends link changes to both roles", () => {
    const link: SseEvent = {
      type: "link.changed",
      data: { state: "live", environment: "station" },
    };
    expect(visible(link, "crew", "alex-morgan")).not.toBeNull();
    expect(visible(link, "ground", null)).not.toBeNull();
  });
});

describe("stream endpoint", () => {
  afterEach(() => undefined);

  it("requires crewId for the crew key and delivers only matching events", async () => {
    const app = await buildApp(
      loadConfig({ DB_PATH: ":memory:" } as NodeJS.ProcessEnv),
      { scheduler: false },
    );
    await app.listen({ port: 4471, host: "127.0.0.1" });

    const missing = await fetch("http://127.0.0.1:4471/v1/stream?token=crew-demo-key");
    expect(missing.status).toBe(400);
    await missing.body?.cancel();

    const open = async (crewId: string) => {
      const response = await fetch(
        `http://127.0.0.1:4471/v1/stream?token=crew-demo-key&crewId=${crewId}`,
      );
      expect(response.status).toBe(200);
      const reader = response.body!.getReader();
      let text = "";
      const loop = (async () => {
        const decoder = new TextDecoder();
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            text += decoder.decode(value);
          }
        } catch {
          // cancelled at the end of the test
        }
      })();
      return { text: () => text, stop: async () => reader.cancel(), loop };
    };

    const alex = await open("alex-morgan");
    const kenji = await open("kenji-sato");
    await new Promise((resolve) => setTimeout(resolve, 150));

    app.ctx.bus.emit(packet("alex-morgan", true));
    app.ctx.bus.emit(packet("kenji-sato"));
    app.ctx.bus.emit(sample("alex-morgan"));
    app.ctx.bus.emit(sample("kenji-sato"));
    await new Promise((resolve) => setTimeout(resolve, 250));

    await alex.stop();
    await kenji.stop();
    await alex.loop;
    await kenji.loop;
    await app.close();

    const alexText = alex.text();
    const kenjiText = kenji.text();
    expect(alexText).toContain("p-alex-morgan");
    expect(alexText).toContain("s-alex-morgan");
    expect(alexText).not.toContain("p-kenji-sato");
    expect(alexText).not.toContain("s-kenji-sato");
    expect(kenjiText).toContain("p-kenji-sato");
    expect(kenjiText).toContain("s-kenji-sato");
    expect(kenjiText).not.toContain("p-alex-morgan");
    expect(kenjiText).not.toContain("s-alex-morgan");
  });
});
