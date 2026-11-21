// CrewDesk — free-model client (SERVER-ONLY).
// One model, proven alive from this VM on 21 Nov 2026:
// TokenHarbor DeepSeek V4.1 Flash (free route `deepseek-v4.1-flash:free`)
// — triage prompt answered in ~3.8s with correct JSON.
// Key: CREW_MODEL_API_KEY (server-only env, never in the repo, never in
// a report). If the key is missing or the call fails, callers get
// { ok: false, source: "unavailable" } and must fall back to the labelled
// DEMO state machine — never a fake "AI" answer.
// Groq was NOT chosen: its default request hit a 429 output-token limit
// in the live test. Apinex is NOT used (free route locked, HTTP 402).

const MODEL_BASE_URL =
  process.env.CREW_MODEL_BASE_URL ?? "https://tokenharbor.ai/v1";
const MODEL_ID = "deepseek-v4.1-flash:free";

export type ModelResult =
  | { ok: true; text: string; source: "live"; latencyMs: number }
  | { ok: false; source: "unavailable"; latencyMs: number; error: string };

export async function callModel(
  system: string,
  user: string,
  maxTokens = 600,
): Promise<ModelResult> {
  const started = Date.now();
  const apiKey = process.env.CREW_MODEL_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      source: "unavailable",
      latencyMs: Date.now() - started,
      error: "CREW_MODEL_API_KEY is not set.",
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${MODEL_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        source: "unavailable",
        latencyMs: Date.now() - started,
        error: `Model provider returned HTTP ${res.status}.`,
      };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return {
        ok: false,
        source: "unavailable",
        latencyMs: Date.now() - started,
        error: "Model returned an empty reply.",
      };
    }
    return { ok: true, text, source: "live", latencyMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      source: "unavailable",
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Model call failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract the first {...} JSON object from a model reply. */
export function extractJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
