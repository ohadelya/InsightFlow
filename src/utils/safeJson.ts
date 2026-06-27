export function safeParseAIJson(rawContent: string): {
  ok: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
  wasRepaired: boolean;
} {
  if (!rawContent || typeof rawContent !== "string") {
    return { ok: false, data: null, error: "No content provided", wasRepaired: false };
  }

  let content = rawContent.trim();

  // Remove markdown fences and code blocks.
  content = content.replace(/```(?:json)?\n?/gi, "");
  content = content.replace(/```/g, "");
  content = content.replace(/~~~(?:json)?\n?/gi, "");
  content = content.replace(/~~~/g, "");

  const firstBraceIndex = content.indexOf("{");
  if (firstBraceIndex === -1) {
    return { ok: false, data: null, error: "No JSON object found", wasRepaired: false };
  }

  content = content.slice(firstBraceIndex);

  let inString = false;
  let escape = false;
  let depth = 0;
  let endIndex = -1;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  const jsonCandidate = endIndex > 0 ? content.slice(0, endIndex) : content;

  try {
    const parsed = JSON.parse(jsonCandidate);
    return {
      ok: true,
      data: parsed,
      error: null,
      wasRepaired: endIndex > 0 && endIndex < content.length,
    };
  } catch (parseError) {
    return {
      ok: false,
      data: null,
      error: parseError instanceof Error ? parseError.message : String(parseError),
      wasRepaired: false,
    };
  }
}
