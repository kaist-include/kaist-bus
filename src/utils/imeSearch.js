const HANGUL_INITIALS = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ"
];

const HANGUL_FINALS = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ"
];

export function getHangulInitial(char) {
  const code = char?.charCodeAt(0);
  if (!code || code < 0xac00 || code > 0xd7a3) return "";
  const index = Math.floor((code - 0xac00) / 588);
  return HANGUL_INITIALS[index] || "";
}

export function getHangulFinalInfo(char) {
  const code = char?.charCodeAt(0);
  if (!code || code < 0xac00 || code > 0xd7a3) return null;
  const offset = code - 0xac00;
  const initialIndex = Math.floor(offset / 588);
  const medialIndex = Math.floor((offset % 588) / 28);
  const finalIndex = offset % 28;
  const finalJamo = HANGUL_FINALS[finalIndex] || "";
  const baseCode = 0xac00 + (initialIndex * 21 + medialIndex) * 28;
  return { baseChar: String.fromCharCode(baseCode), finalJamo };
}

export function hasContinuationMatch(text, baseQuery, finalJamo) {
  if (!baseQuery || !finalJamo) return false;
  const normalized = text.toLowerCase();
  let start = normalized.indexOf(baseQuery);
  while (start !== -1) {
    const nextChar = text[start + baseQuery.length];
    if (nextChar && getHangulInitial(nextChar) === finalJamo) {
      return true;
    }
    start = normalized.indexOf(baseQuery, start + 1);
  }
  return false;
}

export function hasInitialContinuationMatch(text, baseQuery, initialJamo) {
  if (!baseQuery || !initialJamo) return false;
  const normalized = text.toLowerCase();
  let start = normalized.indexOf(baseQuery);
  while (start !== -1) {
    const nextChar = text[start + baseQuery.length];
    if (nextChar && getHangulInitial(nextChar) === initialJamo) {
      return true;
    }
    start = normalized.indexOf(baseQuery, start + 1);
  }
  return false;
}

export function getCompositionFallback(rawQuery, candidates, fallbackQuery) {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(trimmed)) {
    return fallbackQuery || null;
  }
  const lastChar = trimmed.slice(-1);
  const split = getHangulFinalInfo(lastChar);
  if (!split) return null;

  if (!split.finalJamo) {
    const baseQuery = trimmed.slice(0, -1).toLowerCase();
    const lastInitial = getHangulInitial(lastChar);
    const canContinue = candidates.some((text) =>
      hasInitialContinuationMatch(text, baseQuery, lastInitial)
    );
    return canContinue ? (fallbackQuery || baseQuery) : null;
  }

  const baseQuery = (trimmed.slice(0, -1) + split.baseChar).toLowerCase();
  const canContinue = candidates.some((text) =>
    hasContinuationMatch(text, baseQuery, split.finalJamo)
  );
  return canContinue ? (fallbackQuery || baseQuery) : null;
}
