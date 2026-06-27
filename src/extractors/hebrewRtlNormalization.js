const HEBREW_CHAR_REGEX = /[\u0590-\u05FF]/;
const LATIN_CHAR_REGEX = /[A-Za-z]/;

function reverseString(value) {
  return String(value).split("").reverse().join("");
}

function containsHebrew(value) {
  return HEBREW_CHAR_REGEX.test(value);
}

function containsLatin(value) {
  return LATIN_CHAR_REGEX.test(value);
}

function isProtectedToken(token) {
  if (!token) return false;
  if (/@/.test(token)) return true;
  if (/^https?:\/\//i.test(token) || /^www\./i.test(token)) return true;
  if (/^\+?[0-9][0-9().\-]{5,}$/.test(token)) return true;
  return false;
}

function reverseHebrewRuns(token) {
  return String(token).replace(/[\u0590-\u05FF]+/g, (run) => reverseString(run));
}

function normalizeToken(token) {
  if (!token) return token;
  if (isProtectedToken(token)) return token;
  if (!containsHebrew(token)) return token;
  return reverseHebrewRuns(token);
}

function normalizeLine(line) {
  if (typeof line !== "string" || !line.trim()) return line;
  if (!containsHebrew(line)) return line;

  const tokens = line.trim().split(/\s+/);
  const normalizedTokens = tokens.map((token) => normalizeToken(token));

  const isHebrewWordToken = (token) => containsHebrew(token) && !containsLatin(token);
  const changedFlags = tokens.map((token, index) => token !== normalizedTokens[index]);

  let index = 0;
  while (index < normalizedTokens.length) {
    if (!isHebrewWordToken(normalizedTokens[index])) {
      index += 1;
      continue;
    }

    let end = index;
    while (end < normalizedTokens.length && isHebrewWordToken(normalizedTokens[end])) {
      end += 1;
    }

    const groupLength = end - index;
    if (groupLength >= 2) {
      const groupChangedCount = changedFlags.slice(index, end).filter(Boolean).length;
      if (groupChangedCount >= Math.ceil(groupLength * 0.6)) {
        const reversedGroup = normalizedTokens.slice(index, end).reverse();
        for (let i = 0; i < reversedGroup.length; i += 1) {
          normalizedTokens[index + i] = reversedGroup[i];
        }
      }
    }

    index = end;
  }

  return normalizedTokens.join(" ");
}

export function normalizeHebrewRtlText(text) {
  if (typeof text !== "string" || !text) return text || "";
  if (!containsHebrew(text)) return text;

  return text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .join("\n");
}
