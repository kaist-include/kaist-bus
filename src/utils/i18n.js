const LOCALE_KEY = "kaist-bus-locale";

export const LOCALES = {
  KO: "ko",
  EN: "en"
};

const messages = {
  ko: {
    navMain: "메인",
    navTimetable: "시간표",
    navNotice: "공지",
    navFavorite: "즐겨찾기",
    routeSearch: "노선 검색",
    routeLabel: "노선",
    stopLabel: "정류장",
    departLabel: "출발",
    arriveLabel: "도착",
    swapCampus: "출발/도착 바꾸기",
    stopSearch: "정류장 검색",
    searchClear: "검색어 삭제",
    recentSearch: "최근 검색",
    noResults: "검색 결과가 없습니다.",
    nowTime: "지금 시간",
    nearDepartures: "다음 버스",
    routeExplore: "노선 탐색",
    notices: "공지사항",
    emptyNotice: "현재 등록된 공지가 없습니다.",
    footerMain: "KAIST BUS 2.0 · 시간표는 예고 없이 변경될 수 있습니다.",
    footerRoute: "KAIST BUS 2.0 · 실시간 위치 제공 없음 · 시간표는 예고 없이 변경될 수 있습니다.",
    emptyFavorites: "즐겨찾기가 비어 있어요. 상단의 \"즐겨찾기 추가\" 버튼으로 등록해 주세요.",
    noServiceText: "미운행",
    moveUp: "위로",
    moveDown: "아래로",
    remove: "삭제",
    sharedFromLink: "공유된 링크로 열림",
    dayWeekday: "평일",
    dayHoliday: "휴일",
    opDaily: "매일 운영",
    opWeekdayOnly: "평일 운영",
    stopBase: "기준",
    upcoming: "다음 버스",
    upcomingTodayOnly: "오늘 기준에서만 가까운 예정이 표시됩니다.",
    realtimeNotice: "실제 운행과 차이가 있을 수 있음",
    noTimetableForDay: "선택한 운행일에는 시간표가 없습니다.",
    noOperationForDay: "선택한 운행일에는 운행하지 않습니다.",
    weekendHwaamNote:
      "주말에는 기사님께 요청하시면 화암관을 경유합니다.\n\n단, 본교출발 11:30회차는 기사님 점심시간 확보를 위해 요청이 불가합니다.",
    addFavorite: "즐겨찾기 추가",
    removeFavorite: "즐겨찾기 해제",
    cannotAddFavorite: "선택한 운행일에는 운행하지 않아 즐겨찾기를 추가할 수 없어요.",
    copied: "복사됨!",
    shareLink: "링크 공유",
    copyLinkPrompt: "링크를 복사해 주세요.",
    todayMode: "오늘 기준",
    fullTimetable: "전체 시간표",
    lastRun: "막차",
    scheduled: "예정",
    scheduleBased: "시간표 기준"
  },
  en: {
    navMain: "Home",
    navTimetable: "Timetable",
    navNotice: "Notices",
    navFavorite: "Favorites",
    routeSearch: "Search routes",
    routeLabel: "Route",
    stopLabel: "Stop",
    departLabel: "From",
    arriveLabel: "To",
    swapCampus: "Swap departure and arrival",
    stopSearch: "Search stops",
    searchClear: "Clear search",
    recentSearch: "Recent",
    noResults: "No results found.",
    nowTime: "Current Time",
    nearDepartures: "Upcoming",
    routeExplore: "Routes",
    notices: "Notices",
    emptyNotice: "No notices at the moment.",
    footerMain: "KAIST BUS 2.0 · Timetables may change without notice.",
    footerRoute: "KAIST BUS 2.0 · No real-time tracking · Timetables may change without notice.",
    emptyFavorites: "No favorites yet. Add a favorite from route details.",
    noServiceText: "No service",
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove",
    sharedFromLink: "Opened from shared link",
    dayWeekday: "Weekday",
    dayHoliday: "Holiday",
    opDaily: "Daily",
    opWeekdayOnly: "Weekday only",
    stopBase: "base",
    upcoming: "Upcoming",
    upcomingTodayOnly: "Upcoming is shown only for Today mode.",
    realtimeNotice: "Actual operation may differ",
    noTimetableForDay: "No timetable is available for the selected service day.",
    noOperationForDay: "No service on the selected service day.",
    weekendHwaamNote:
      "On weekends, the shuttle can detour via Hwaam Hall upon request.\n\nException: The 11:30 departure from Main Campus cannot accept requests due to driver lunch break.",
    addFavorite: "Add Favorite",
    removeFavorite: "Remove Favorite",
    cannotAddFavorite: "No service on the selected day. You cannot add this as favorite.",
    copied: "Copied!",
    shareLink: "Share Link",
    copyLinkPrompt: "Please copy this link.",
    todayMode: "Today",
    fullTimetable: "Full Timetable",
    lastRun: "Last",
    scheduled: "Scheduled",
    scheduleBased: "Schedule-based"
  }
};

export function getInitialLocale() {
  try {
    const saved = (localStorage.getItem(LOCALE_KEY) || "").toLowerCase();
    if (saved === LOCALES.KO || saved === LOCALES.EN) return saved;
  } catch {
    // ignore
  }
  const browser = (navigator.language || "ko").toLowerCase();
  return browser.startsWith("ko") ? LOCALES.KO : LOCALES.EN;
}

export function setLocale(locale) {
  const normalized = (locale || "").toLowerCase();
  const next = normalized === LOCALES.EN ? LOCALES.EN : LOCALES.KO;
  try {
    localStorage.setItem(LOCALE_KEY, next);
  } catch {
    // ignore
  }
  return next;
}

export function t(locale, key) {
  return messages[locale]?.[key] ?? messages.ko[key] ?? key;
}

export function getLocalizedText(entity, locale, key = "name") {
  if (!entity) return "";
  if (locale === LOCALES.EN) {
    const candidate = entity[`${key}En`] || entity[`${key}_en`];
    if (candidate) return candidate;
  }
  return entity[key] || "";
}

export function applyStaticI18n(locale) {
  document.documentElement.lang = locale === LOCALES.EN ? "en" : "ko";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key) node.textContent = t(locale, key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (key) node.setAttribute("placeholder", t(locale, key));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    const key = node.getAttribute("data-i18n-aria-label");
    if (key) node.setAttribute("aria-label", t(locale, key));
  });
}
