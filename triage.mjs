import path from "node:path";
import { fileURLToPath } from "node:url";
import { classify } from "./mock-ai.mjs";

const ALLOWED_TOPICS = new Set(["delivery", "pricing", "other"]);
const MODEL_TIMEOUT_MS = 300;

export function isValidInput(text) {
  return typeof text === "string" && text.trim().length > 0;
}

function isValidModelResult(result) {
  return (
    result !== null &&
    typeof result === "object" &&
    ALLOWED_TOPICS.has(result.topic) &&
    typeof result.draft === "string" &&
    result.draft.trim().length > 0
  );
}

export async function triage(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const raw = await classify(text, { signal: controller.signal });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: "manual_review", topic: null, draft: null };
    }

    if (!isValidModelResult(parsed)) {
      return { status: "manual_review", topic: null, draft: null };
    }

    return { status: "ready", topic: parsed.topic, draft: parsed.draft };
  } catch {
    return { status: "manual_review", topic: null, draft: null };
  } finally {
    clearTimeout(timer);
  }
}

// Исполнимый тест сбоя: node triage.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = await triage("проверка [timeout]");
  const ok =
    result.status === "manual_review" &&
    result.topic === null &&
    result.draft === null;

  if (!ok) {
    console.error("FAIL: ожидался manual_review с topic/draft = null", result);
    process.exit(1);
  }
  console.log("OK: таймаут модели → manual_review, черновик очищен");
}
