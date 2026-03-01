const KOREAN_INITIALS = [
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

export function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EN_TO_JAMO = {
  r: "ㄱ",
  R: "ㄲ",
  s: "ㄴ",
  e: "ㄷ",
  E: "ㄸ",
  f: "ㄹ",
  a: "ㅁ",
  q: "ㅂ",
  Q: "ㅃ",
  t: "ㅅ",
  T: "ㅆ",
  d: "ㅇ",
  w: "ㅈ",
  W: "ㅉ",
  c: "ㅊ",
  z: "ㅋ",
  x: "ㅌ",
  v: "ㅍ",
  g: "ㅎ",
  k: "ㅏ",
  o: "ㅐ",
  i: "ㅑ",
  O: "ㅒ",
  j: "ㅓ",
  p: "ㅔ",
  u: "ㅕ",
  P: "ㅖ",
  h: "ㅗ",
  y: "ㅛ",
  n: "ㅜ",
  b: "ㅠ",
  m: "ㅡ",
  l: "ㅣ"
};

const INITIALS = [
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
const MEDIALS = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ"
];
const FINALS = [
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

const COMBINE_MEDIAL = {
  "ㅗㅏ": "ㅘ",
  "ㅗㅐ": "ㅙ",
  "ㅗㅣ": "ㅚ",
  "ㅜㅓ": "ㅝ",
  "ㅜㅔ": "ㅞ",
  "ㅜㅣ": "ㅟ",
  "ㅡㅣ": "ㅢ"
};
const COMBINE_FINAL = {
  "ㄱㅅ": "ㄳ",
  "ㄴㅈ": "ㄵ",
  "ㄴㅎ": "ㄶ",
  "ㄹㄱ": "ㄺ",
  "ㄹㅁ": "ㄻ",
  "ㄹㅂ": "ㄼ",
  "ㄹㅅ": "ㄽ",
  "ㄹㅌ": "ㄾ",
  "ㄹㅍ": "ㄿ",
  "ㄹㅎ": "ㅀ",
  "ㅂㅅ": "ㅄ"
};

const isConsonant = (jamo) => INITIALS.includes(jamo);
const isVowel = (jamo) => MEDIALS.includes(jamo);

function convertEnglishToJamo(value) {
  let result = "";
  for (const char of value) {
    result += EN_TO_JAMO[char] || char;
  }
  return result;
}

function composeHangul(jamoText) {
  const chars = [...jamoText];
  let result = "";
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];
    if (!isConsonant(ch)) {
      result += ch;
      i += 1;
      continue;
    }

    const next = chars[i + 1];
    if (!next || !isVowel(next)) {
      result += ch;
      i += 1;
      continue;
    }

    let initial = ch;
    let medial = next;
    let final = "";
    i += 2;

    const medialNext = chars[i];
    if (medialNext && isVowel(medialNext)) {
      const combined = COMBINE_MEDIAL[medial + medialNext];
      if (combined) {
        medial = combined;
        i += 1;
      }
    }

    const finalCandidate = chars[i];
    const afterFinal = chars[i + 1];
    if (finalCandidate && isConsonant(finalCandidate) && !isVowel(afterFinal)) {
      let combinedFinal = finalCandidate;
      const maybeDouble = finalCandidate + (chars[i + 1] || "");
      if (COMBINE_FINAL[maybeDouble] && !isVowel(chars[i + 2])) {
        combinedFinal = COMBINE_FINAL[maybeDouble];
        i += 2;
      } else {
        i += 1;
      }
      final = combinedFinal;
    }

    const initialIndex = INITIALS.indexOf(initial);
    const medialIndex = MEDIALS.indexOf(medial);
    const finalIndex = FINALS.indexOf(final);
    if (initialIndex === -1 || medialIndex === -1 || finalIndex === -1) {
      result += initial + medial + final;
    } else {
      const code = 0xac00 + (initialIndex * 21 + medialIndex) * 28 + finalIndex;
      result += String.fromCharCode(code);
    }
  }

  return result;
}

function getQueryVariants(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const variants = new Set([trimmed.toLowerCase()]);
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(trimmed)) {
    const composed = composeHangul(trimmed);
    if (composed && composed !== trimmed) {
      variants.add(composed.toLowerCase());
      if (composed.length > 1) {
        variants.add(composed.slice(0, -1).toLowerCase());
      }
    }
  }
  if (/[a-z]/i.test(trimmed)) {
    const jamo = convertEnglishToJamo(trimmed);
    const composed = composeHangul(jamo);
    if (jamo !== trimmed) variants.add(jamo.toLowerCase());
    if (composed !== trimmed) variants.add(composed.toLowerCase());
    if (jamo.length > 2) {
      const droppedLast = composeHangul(jamo.slice(0, -1));
      if (droppedLast) variants.add(droppedLast.toLowerCase());
      const droppedTwo = composeHangul(jamo.slice(0, -2));
      if (droppedTwo) variants.add(droppedTwo.toLowerCase());
    }
    if (jamo.length > 1 && isConsonant(jamo[jamo.length - 1])) {
      const withoutFinal = composeHangul(jamo.slice(0, -1));
      if (withoutFinal) variants.add(withoutFinal.toLowerCase());
    }
    if (composed.length > 1) {
      variants.add(composed.slice(0, -1).toLowerCase());
    }
    if (composed.length > 2) {
      variants.add(composed.slice(0, -2).toLowerCase());
    }
  }
  return Array.from(variants);
}

export function getInitials(text) {
  let result = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const index = Math.floor((code - 0xac00) / 588);
      result += KOREAN_INITIALS[index] || "";
    } else {
      result += char;
    }
  }
  return result;
}

export function isInitialQuery(query) {
  return query && /^[ㄱ-ㅎ]+$/.test(query);
}

export function matchesQuery(text, query) {
  if (!query) return true;
  const normalized = text.toLowerCase();
  const variants = getQueryVariants(query);
  return variants.some((variant) => {
    if (!variant) return false;
    if (normalized.includes(variant)) return true;
    if (isInitialQuery(variant)) {
      return getInitials(text).includes(variant);
    }
    return false;
  });
}

export function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const normalized = text.toLowerCase();
  const variants = getQueryVariants(query);
  const highlightQuery = variants.find(
    (variant) => variant && !isInitialQuery(variant) && normalized.includes(variant)
  );
  if (!highlightQuery) return escapeHtml(text);
  const idx = normalized.indexOf(highlightQuery);
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + highlightQuery.length));
  const after = escapeHtml(text.slice(idx + highlightQuery.length));
  return `${before}<mark class="search-highlight">${match}</mark>${after}`;
}
