// 상단 공지 티커에서 쓸 '페이지' 배열을 만든다.
// 각 공지는 "[태그] 제목" 페이지 + 본문을 문장 단위로 나눈 페이지들로 분해된다.
// 티커는 이 페이지들을 일정 시간마다 한 줄씩 위로 올려 보여주므로,
// 공지가 길어도 잘리지 않고 문장이 순서대로 전부 노출된다.
// 짧은 공지(본문 없음)는 제목 한 페이지로 끝난다.
export function buildNoticePages(notices, isEn) {
  const pages = [];
  for (const notice of notices) {
    const tag = isEn ? notice.tagEn || notice.tag || "Notice" : notice.tag || "공지";
    const title = isEn ? notice.titleEn || notice.title : notice.title;
    const body = isEn ? notice.bodyEn || notice.body || "" : notice.body || "";
    pages.push(`[${tag}] ${title}`);
    // 문장 끝(. ! ? 。) 뒤 공백을 기준으로 본문을 문장 단위로 분해.
    const sentences = body
      .split(/(?<=[.!?。])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sentence of sentences) pages.push(sentence);
  }
  return pages;
}
