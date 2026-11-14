/** Local PIN gate for private wellbeing data. Not encryption: a lock on the UI. */

export async function hashPin(pin: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return `plain:${pin}`;
  const bytes = new TextEncoder().encode(`crewsignal:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
