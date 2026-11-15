/// <reference lib="webworker" />
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * WebLLM worker. All WebGPU work happens here so the UI thread never blocks;
 * the page talks to it through CreateWebWorkerMLCEngine.
 */
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (event: MessageEvent) => {
  handler.onmessage(event);
};
