// 상단 공지 티커에 표시할 텍스트 배열을 만든다.
// 공지 하나당 "[태그] 제목 - 본문" 한 덩어리(통짜)로, 자르지 않는다.
// 티커는 이 항목들을 일정 시간마다 교체하고, 각 항목은 CSS 줄바꿈으로 전체가 그대로 노출된다.
export function buildNoticePages(notices, isEn) {
  return notices.map((notice) => {
    const tag = isEn ? notice.tagEn || notice.tag || "Notice" : notice.tag || "공지";
    const title = isEn ? notice.titleEn || notice.title : notice.title;
    const body = isEn ? notice.bodyEn || notice.body || "" : notice.body || "";
    return `[${tag}] ${title}${body ? ` - ${body}` : ""}`;
  });
}
