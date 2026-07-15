// 상단 공지 티커에서 쓸 '페이지' 배열을 만든다.
//
// fit(측정 정보)이 주어지면 각 공지 텍스트를 브라우저에서 실제로 보이는 폭에 맞춰
// 단어 단위로 최대한 채워 끊는다. 넓은 화면에서는 공지 하나가 한 페이지에 다 들어가고,
// 좁은 화면에서는 여러 페이지로 나뉘어 순환한다.
// fit이 없으면(측정 불가) 제목 + 본문 문장 단위로 폴백한다.
export function buildNoticePages(notices, isEn, fit = null) {
  const pages = [];
  for (const notice of notices) {
    const tag = isEn ? notice.tagEn || notice.tag || "Notice" : notice.tag || "공지";
    const title = isEn ? notice.titleEn || notice.title : notice.title;
    const body = isEn ? notice.bodyEn || notice.body || "" : notice.body || "";
    const full = `[${tag}] ${title}${body ? ` - ${body}` : ""}`.trim();
    if (fit && fit.availWidth > 0 && typeof fit.measure === "function") {
      wrapToWidth(full, fit, pages);
    } else {
      pages.push(`[${tag}] ${title}`);
      for (const sentence of splitSentences(body)) pages.push(sentence);
    }
  }
  return pages;
}

// 문장 끝(. ! ? 。) 뒤 공백을 기준으로 본문을 문장 단위로 분해 (폴백용).
function splitSentences(body) {
  return body
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 단어를 순서대로 채우다 availWidth를 넘기면 새 페이지로 넘긴다.
function wrapToWidth(text, fit, out) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && fit.measure(candidate) > fit.availWidth) {
      out.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) out.push(line);
}

// 티커 엘리먼트의 현재 렌더 폭·폰트를 재서 buildNoticePages에 넘길 fit 객체를 만든다.
// 폭을 못 재면(숨김/미마운트) null 을 반환해 문장 단위 폴백을 타게 한다.
export function createTickerFit(el) {
  if (!el || typeof document === "undefined" || typeof getComputedStyle !== "function") return null;
  const cs = getComputedStyle(el);
  const availWidth =
    el.clientWidth -
    parseFloat(cs.paddingLeft || "0") -
    parseFloat(cs.paddingRight || "0") -
    2; // 소수점/자간 오차 여유
  if (!(availWidth > 0)) return null;
  const canvas =
    createTickerFit._canvas || (createTickerFit._canvas = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return { availWidth, measure: (text) => ctx.measureText(text).width };
}
