import holidays from "./data/holidays.json";
import notices from "./data/notices.json";
import routesData from "./data/routes.json";
import routePresetsData from "./data/routePresets.json";
import {
  formatClockWithSeconds,
  formatKoreanDate,
  formatKoreanWeekday,
  isWeekend,
  minutesToTime,
  toIsoDate
} from "./utils/time.js";
import { getStopShortName } from "./utils/stopLabels.js";
import { escapeHtml, matchesQuery, highlightMatch } from "./utils/search.js";
import { getCompositionFallback } from "./utils/imeSearch.js";
import { readRecentSearches, addRecentSearch } from "./utils/recentSearch.js";
import { getRouteSearchText, getSearchCandidates, resolveHighlightSource } from "./utils/searchUi.js";
import {
  LOCALES,
  applyStaticI18n,
  getInitialLocale,
  getLocalizedText,
  setLocale,
  t
} from "./utils/i18n.js";

const FAVORITES_KEY = "kaist-bus-favorites";
const THEME_KEY = "kaist-bus-theme";
const NIGHT_SKY_KEY = "kaist-bus-night-sky";
const NIGHT_SKY_META_KEY = "kaist-bus-night-sky-meta";
const NIGHT_SKY_VERSION = "v3";
const NIGHT_SKY_TTL_MS = 24 * 60 * 60 * 1000;
const BIG_STAR_PROB = 1 / 7;
const CARD_GLOW_KEY = "kaist-bus-card-glow";
let nightSkyCss = null;
const CAMPUS_LOOP_ID = "campus-loop";
const NAV_WRAP_SLACK = 12;
const BUILD_DATE = typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "";
const CROSSOVER_MINUTES = 4 * 60;
const CAMPUS_OPTIONS = [
  { id: "main", label: "본교", labelEn: "Main", match: /본교|main/i },
  { id: "munji", label: "문지", labelEn: "Munji", match: /문지|munji/i },
  { id: "hwaam", label: "화암", labelEn: "Hwaam", match: /화암|hwaam/i }
];

function mergeDuplicateRoutes(routes) {
  const merged = new Map();
  routes.forEach((route) => {
    if (!merged.has(route.id)) {
      merged.set(route.id, {
        ...route,
        stops: route.stops.map((stop) => ({
          ...stop,
          times: {
            weekday: [...(stop.times?.weekday || [])],
            weekend: [...(stop.times?.weekend || [])]
          }
        }))
      });
      return;
    }
    const target = merged.get(route.id);
    if (!target.note && route.note) target.note = route.note;
    if (!target.noteEn && route.noteEn) target.noteEn = route.noteEn;
    const stopMap = new Map(target.stops.map((stop) => [stop.name, stop]));
    route.stops.forEach((stop) => {
      const existing = stopMap.get(stop.name);
      if (!existing) {
        const nextStop = {
          ...stop,
          times: {
            weekday: [...(stop.times?.weekday || [])],
            weekend: [...(stop.times?.weekend || [])]
          }
        };
        target.stops.push(nextStop);
        stopMap.set(stop.name, nextStop);
        return;
      }
      ["weekday", "weekend"].forEach((day) => {
        const base = existing.times?.[day] || [];
        const extra = stop.times?.[day] || [];
        if (!base.length && extra.length) {
          existing.times[day] = [...extra];
          return;
        }
        extra.forEach((time) => {
          if (!base.includes(time)) base.push(time);
        });
      });
    });
  });
  return Array.from(merged.values());
}

const mergedRoutes = mergeDuplicateRoutes(routesData.routes);

function getStopsForDay(route, day) {
  const dayStops = route.stops.filter((stop) => (stop.times?.[day] || []).length);
  return dayStops.length ? dayStops : route.stops;
}

function findStopForDay(route, stopId, day) {
  const matches = route.stops.filter((stop) => stop.id === stopId);
  if (!matches.length) return null;
  const withTimes = matches.find((stop) => (stop.times?.[day] || []).length);
  return withTimes || matches[0];
}

function normalizeServiceMinutes(timeStr) {
  const [rawH, rawM] = timeStr.split(":").map(Number);
  if (Number.isNaN(rawH) || Number.isNaN(rawM)) return 0;
  let minutes = rawH * 60 + rawM;
  if (rawH < 4) {
    minutes += 1440;
  }
  return minutes;
}

function getLastServiceMinute(times) {
  if (!times || times.length === 0) return null;
  return Math.max(...times.map(normalizeServiceMinutes));
}

function getRouteLastServiceMinute(route, day) {
  if (!route) return null;
  const times = route.stops.flatMap((stop) => stop.times?.[day] || []);
  return getLastServiceMinute(times);
}

function getEffectiveDayForStop(date, stop, route) {
  const currentDay = getResolvedDay(date);
  const prevDate = new Date(date);
  prevDate.setDate(date.getDate() - 1);
  const prevDay = getResolvedDay(prevDate);
  if (currentDay === prevDay) return currentDay;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  if (nowMinutes >= CROSSOVER_MINUTES) return currentDay;
  const lastPrev = route
    ? getRouteLastServiceMinute(route, prevDay)
    : getLastServiceMinute(stop?.times?.[prevDay] || []);
  const prevStillRunning = lastPrev != null && lastPrev >= nowMinutes + 1440;
  const hasTimes = (day) => (stop?.times?.[day] || []).length > 0;
  let preferred = prevStillRunning ? prevDay : currentDay;
  if (preferred === prevDay && !hasTimes(prevDay) && hasTimes(currentDay)) {
    preferred = currentDay;
  }
  if (preferred === currentDay && !hasTimes(currentDay) && hasTimes(prevDay) && prevStillRunning) {
    preferred = prevDay;
  }
  return preferred;
}

const state = {
  now: new Date(),
  serviceDay: "weekday",
  holidayLabel: "",
  selectedRouteId: "",
  selectedStopId: "",
  selectedDestinationId: "",
  routeSearch: "",
  routeSearchBase: "",
  routeSearchComposing: false,
  routeSearchStable: "",
  routeSearchLastHtml: "",
  routeSearchLastKeys: "",
  routeSearchLastHighlight: "",
  routeSearchActive: false,
  glowLocked: false,
  locale: getInitialLocale()
};

let noticeTickerTimer = null;
let noticeTickerIndex = 0;
let noticeTickerFadeTimer = null;
let noticeTickerSwapTimer = null;

function localizeRoute(route) {
  return getLocalizedText(route, state.locale, "name");
}

function localizeStop(stop) {
  return getLocalizedText(stop, state.locale, "name");
}

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}



function isCampusLoop(route) {
  return route?.id === CAMPUS_LOOP_ID;
}

function getCampusLabel(id) {
  const option = CAMPUS_OPTIONS.find((entry) => entry.id === id);
  if (!option) return id;
  return state.locale === LOCALES.EN ? option.labelEn : option.label;
}

function getCampusIdForStop(stopName) {
  const hit = CAMPUS_OPTIONS.find((option) => option.match.test(stopName));
  return hit ? hit.id : null;
}

function getNextCampusForStop(stops, startIndex) {
  const startCampus = getCampusIdForStop(stops[startIndex].name);
  for (let i = startIndex + 1; i < stops.length; i += 1) {
    const nextCampus = getCampusIdForStop(stops[i].name);
    if (nextCampus && nextCampus !== startCampus) return nextCampus;
  }
  return null;
}

function getCampusDepartureStop(route, fromId, toId) {
  const stops = route.stops || [];
  const campusStops = stops
    .map((stop, index) => ({ stop, index, campus: getCampusIdForStop(stop.name) }))
    .filter((entry) => entry.campus === fromId);

  if (!campusStops.length) {
    return stops[0];
  }

  const departures = campusStops.filter((entry) => /출발/.test(entry.stop.name));
  const candidates = departures.length ? departures : campusStops;

  if (toId) {
    const direct = candidates.find((entry) => getNextCampusForStop(stops, entry.index) === toId);
    if (direct) return direct.stop;
  }

  return candidates[0].stop;
}

function normalizeTimeForFilter(timeStr) {
  const s = String(timeStr || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return s;
  return `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
}

function filterCampusLoopTimes(route, day, times, campusFrom, campusTo) {
  if (!isCampusLoop(route)) return times;
  const pairKey = `${campusFrom}->${campusTo}`;
  const pairTimes = route?.campusPairs?.[day]?.[pairKey];
  if (Array.isArray(pairTimes) && pairTimes.length > 0) {
    return pairTimes.slice();
  }
  const excludeList = route?.campusPairExcludeTimes?.[pairKey];
  if (Array.isArray(excludeList) && excludeList.length > 0 && Array.isArray(times)) {
    const set = new Set(excludeList.map(normalizeTimeForFilter));
    return times.filter((t) => !set.has(normalizeTimeForFilter(t)));
  }
  if (day === "weekend" && campusFrom === "main" && campusTo === "hwaam") {
    return times.filter((time) => time.trim() !== "11:30");
  }
  return times;
}

function writeFavorites(items) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}

function getFavoritePreviewLimit() {
  const viewportWidth = window.innerWidth || 1280;
  if (viewportWidth < 420) return 2;
  if (viewportWidth < 700) return 3;
  if (viewportWidth < 980) return 4;
  return 5;
}

function getMainNextPreviewLimit() {
  const viewportWidth = window.innerWidth || 1280;
  if (viewportWidth < 420) return 4;
  if (viewportWidth < 700) return 5;
  if (viewportWidth < 980) return 6;
  return 7;
}

function getRemainingDeparturesUntilLast(times, nowMinutesWithTolerance) {
  if (!times?.length) return [];
  const normalized = times
    .map((time) => normalizeServiceMinutes(time))
    .sort((a, b) => a - b);
  const lastMinute = normalized[normalized.length - 1];
  return normalized
    .filter((minute) => minute >= nowMinutesWithTolerance && minute <= lastMinute)
    .map((minute) => minutesToTime(minute));
}

function toggleFavorite(routeId, stopId) {
  const items = readFavorites();
  const key = `${routeId}:${stopId}`;
  const next = items.some((item) => item.key === key)
    ? items.filter((item) => item.key !== key)
    : [
        {
          key,
          routeId,
          stopId,
          savedAt: Date.now()
        },
        ...items
      ];
  writeFavorites(next.slice(0, 10));
}

function resolveServiceDay(date) {
  const iso = toIsoDate(date);
  if (holidays.forcedWeekends.includes(iso)) {
    return {
      day: "weekend",
      labelKo: holidays.labels?.[iso] || "휴일",
      labelEn: holidays.labelsEn?.[iso] || "Holiday"
    };
  }
  return isWeekend(date)
    ? { day: "weekend", labelKo: "주말", labelEn: "Weekend" }
    : { day: "weekday", labelKo: "평일", labelEn: "Weekday" };
}

function getResolvedDay(date) {
  return resolveServiceDay(date).day;
}

function getThemePreference() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function setThemePreference(value) {
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    // ignore storage errors
  }
}

function applyThemeByPreference(date) {
  const preference = getThemePreference();
  let isDaytime = true;
  if (preference === "dark") {
    isDaytime = false;
  } else if (preference === "light") {
    isDaytime = true;
  } else {
    const hour = date.getHours();
    isDaytime = hour >= 6 && hour < 18;
  }
  document.body.classList.toggle("theme-night", !isDaytime);
  document.documentElement.classList.toggle("theme-night", !isDaytime);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", !isDaytime ? "#05070f" : "#e9ecff");
  }
  if (!isDaytime) {
    applyNightSky();
  } else {
    document.documentElement.style.removeProperty("--night-sky");
    document.documentElement.style.removeProperty("--app-bg");
  }
}

function applyNightSky() {
  if (!nightSkyCss && window.__nightSkyCss) {
    nightSkyCss = window.__nightSkyCss;
  }
  let meta = null;
  try {
    meta = JSON.parse(
      localStorage.getItem(NIGHT_SKY_META_KEY) ||
        sessionStorage.getItem(NIGHT_SKY_META_KEY) ||
        "null"
    );
  } catch {
    meta = null;
  }
  const now = Date.now();
  const shouldRefresh =
    !meta ||
    meta.version !== NIGHT_SKY_VERSION ||
    !meta.createdAt ||
    now - meta.createdAt > NIGHT_SKY_TTL_MS;

  if (!nightSkyCss && !shouldRefresh) {
    try {
      nightSkyCss = localStorage.getItem(NIGHT_SKY_KEY) || sessionStorage.getItem(NIGHT_SKY_KEY);
    } catch {
      nightSkyCss = null;
    }
  }

  if (!nightSkyCss || shouldRefresh) {
    nightSkyCss = buildNightSky();
    try {
      const nextMeta = JSON.stringify({ version: NIGHT_SKY_VERSION, createdAt: now });
      localStorage.setItem(NIGHT_SKY_KEY, nightSkyCss);
      localStorage.setItem(NIGHT_SKY_META_KEY, nextMeta);
      sessionStorage.setItem(NIGHT_SKY_KEY, nightSkyCss);
      sessionStorage.setItem(NIGHT_SKY_META_KEY, nextMeta);
    } catch {
      // ignore storage errors
    }
  }
  window.__nightSkyCss = nightSkyCss;
  document.documentElement.style.setProperty("--night-sky", nightSkyCss);
  document.documentElement.style.setProperty("--app-bg", nightSkyCss);
}

function buildNightSky() {
  const layers = [];
  const starCount = 18;
  for (let i = 0; i < starCount; i += 1) {
    const x = (Math.random() * 96 + 2).toFixed(2);
    const band = i % 3;
    const bandStart = band === 0 ? 4 : band === 1 ? 34 : 64;
    const y = (bandStart + Math.random() * 30).toFixed(2);
    const size = (Math.random() * 1.8 + 0.6).toFixed(2);
    const alpha = (Math.random() * 0.5 + 0.35).toFixed(2);
    const isGolden = Math.random() < 0.25;
    const color = isGolden
      ? `rgba(255, 238, 180, ${alpha})`
      : `rgba(255, 255, 255, ${alpha})`;
    layers.push(
      `radial-gradient(circle at ${x}% ${y}%, ${color} 0 ${size}px, transparent ${(
        Number(size) + 1.6
      ).toFixed(2)}px)`
    );
  }
  if (Math.random() < BIG_STAR_PROB) {
    const x = (Math.random() * 90 + 5).toFixed(2);
    const y = (Math.random() * 70 + 8).toFixed(2);
    layers.push(
      `radial-gradient(circle at ${x}% ${y}%, rgba(255, 244, 190, 0.5) 0 5px, transparent 11px)`
    );
  }
  layers.push("linear-gradient(180deg, #05070f 0%, #0b1026 55%, #141b3f 100%)");
  return layers.join(", ");
}

function buildCardGlowLayers() {
  const edgeValue = () => {
    if (Math.random() < 0.7) {
      return Math.random() < 0.5 ? -15 + Math.random() * 20 : 95 + Math.random() * 20;
    }
    return 15 + Math.random() * 70;
  };
  const makeGlow = (rgb, alphaBase) => {
    const x = Math.round(edgeValue());
    const y = Math.round(edgeValue());
    const width = Math.floor(420 + Math.random() * 420);
    const height = Math.floor(320 + Math.random() * 360);
    const alpha = (alphaBase + Math.random() * 0.06).toFixed(2);
    return `radial-gradient(${width}px ${height}px at ${x}% ${y}%, rgba(${rgb}, ${alpha}), transparent 72%)`;
  };

  const palette = [
    "246, 226, 138",
    "255, 181, 201",
    "171, 228, 255",
    "160, 255, 224",
    "198, 176, 255",
    "255, 214, 165"
  ];
  const layers = [];
  for (let i = 0; i < 6; i += 1) {
    const rgb = palette[i % palette.length];
    layers.push(makeGlow(rgb, 0.045));
  }
  return layers;
}

function applyRandomCardGlow() {
  if (state.routeSearchActive) return;
  if (!document.body.classList.contains("theme-night")) return;
  const cards = document.querySelectorAll(
    ".hero-card, .next-card, .notice-card, .time-table"
  );
  let glowMap = {};
  try {
    glowMap = JSON.parse(sessionStorage.getItem(CARD_GLOW_KEY) || "{}");
  } catch {
    glowMap = {};
  }

  const getCardType = (card) => {
    if (card.classList.contains("hero-card")) return "hero";
    if (card.classList.contains("next-card")) return "next";
    if (card.classList.contains("notice-card")) return "notice";
    if (card.classList.contains("route-card")) return "route";
    if (card.classList.contains("time-table")) return "table";
    return "card";
  };

  const pageKey = location.pathname.replace(/\W+/g, "") || "index";
  const typeCounters = {};
  const allowGenerate = !state.glowLocked;
  for (const card of cards) {
    const type = getCardType(card);
    const nextIndex = (typeCounters[type] ?? 0);
    typeCounters[type] = nextIndex + 1;
    const customKey = card.dataset.glowKey;
    const key = `${pageKey}:${type}:${customKey || nextIndex}`;
    if (!glowMap[key]) {
      if (!allowGenerate) {
        continue;
      }
      glowMap[key] = buildCardGlowLayers();
    }
    const [glow1, glow2, glow3] = glowMap[key];
    card.style.setProperty("--card-glow-1", glow1);
    card.style.setProperty("--card-glow-2", glow2);
    card.style.setProperty("--card-glow-3", glow3);
  }

  try {
    sessionStorage.setItem(CARD_GLOW_KEY, JSON.stringify(glowMap));
  } catch {
    // ignore storage errors
  }
  if (allowGenerate) {
    state.glowLocked = true;
  }
}

function lockCardGlow() {
  if (!document.body.classList.contains("theme-night")) return;
  applyRandomCardGlow();
}

function applyRouteCardGlowStable() {
  if (!document.body.classList.contains("theme-night")) return;
  const list = document.querySelector("#routeList");
  if (!list) return;
  const cards = list.querySelectorAll(".route-card");
  if (!cards.length) return;
  let glowMap = {};
  try {
    glowMap = JSON.parse(sessionStorage.getItem(CARD_GLOW_KEY) || "{}");
  } catch {
    glowMap = {};
  }
  cards.forEach((card) => {
    const key = `route:${card.dataset.glowKey || ""}`;
    if (!glowMap[key]) return;
    const [glow1, glow2, glow3] = glowMap[key];
    card.style.setProperty("--card-glow-1", glow1);
    card.style.setProperty("--card-glow-2", glow2);
    card.style.setProperty("--card-glow-3", glow3);
  });
  try {
    sessionStorage.setItem(CARD_GLOW_KEY, JSON.stringify(glowMap));
  } catch {
    // ignore storage errors
  }
}

function ensureRouteGlowCache(routes) {
  if (!document.body.classList.contains("theme-night")) return;
  let glowMap = {};
  try {
    glowMap = JSON.parse(sessionStorage.getItem(CARD_GLOW_KEY) || "{}");
  } catch {
    glowMap = {};
  }
  routes.forEach((route) => {
    const key = `route:${route.id}`;
    if (!glowMap[key]) {
      glowMap[key] = buildCardGlowLayers();
    }
  });
  try {
    sessionStorage.setItem(CARD_GLOW_KEY, JSON.stringify(glowMap));
  } catch {
    // ignore storage errors
  }
}

function getRoutesForDay(day) {
  const preferredOrder = ["olev", "campus-loop", "wolpyeong", "wolpyeong-early"];
  return mergedRoutes
    .filter((route) => {
      return route.stops.some((stop) => stop.times?.[day]?.length);
    })
    .slice()
    .sort((a, b) => {
      const indexA = preferredOrder.indexOf(a.id);
      const indexB = preferredOrder.indexOf(b.id);
      const weightA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
      const weightB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
      if (weightA !== weightB) return weightA - weightB;
      return a.name.localeCompare(b.name);
    });
}

function getRouteExploreList() {
  const preferredOrder = ["olev", "campus-loop", "wolpyeong", "wolpyeong-early"];
  return preferredOrder
    .map((id) => mergedRoutes.find((route) => route.id === id))
    .filter(Boolean);
}

function buildRouteHref({ routeId, stopId, campusFrom, campusTo }) {
  const params = new URLSearchParams();
  if (routeId) params.set("route", routeId);
  if (stopId) params.set("stop", stopId);
  if (campusFrom) params.set("from", campusFrom);
  if (campusTo) params.set("to", campusTo);
  const query = params.toString();
  return query ? `./route.html?${query}` : "./route.html";
}

function pickDefaultRoute(routes) {
  return routes.find((route) => route.stops.some((s) => s.default)) || routes[0];
}

function renderTime() {
  const clockEls = document.querySelectorAll("[data-clock]");
  const dateEls = document.querySelectorAll("[data-date]");
  const weekdayEls = document.querySelectorAll("[data-weekday]");
  const clockCardEls = document.querySelectorAll("[data-clock-card]");
  const dateCardEls = document.querySelectorAll("[data-date-card]");
  const weekdayCardEls = document.querySelectorAll("[data-weekday-card]");
  const weekdayBadge = document.querySelector("[data-weekday-badge]");
  if (!clockEls.length || !dateEls.length || !weekdayEls.length) return;

  state.now = new Date();
  const timeText = formatClockWithSeconds(state.now);
  clockEls.forEach((el) => {
    el.textContent = timeText;
  });
  clockCardEls.forEach((el) => {
    el.textContent = timeText;
  });
  const rawDate = formatKoreanDate(state.now);
  const dateText = state.locale === LOCALES.EN
    ? state.now.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    : rawDate.replace(/^\d{4}년\s*/, "");
  dateEls.forEach((el) => {
    el.textContent = dateText;
  });
  dateCardEls.forEach((el) => {
    el.textContent = dateText;
  });
  const { day, labelKo, labelEn } = resolveServiceDay(state.now);
  state.serviceDay = day;
  state.holidayLabel = state.locale === LOCALES.EN ? labelEn : labelKo;
  const dayLabel = day === "weekday" ? "평일" : "휴일";
  const weekdayKo = formatKoreanWeekday(state.now);
  const weekdayEn = state.now.toLocaleDateString("en-US", { weekday: "long" });
  const dayBadgeKo = dayLabel;
  const dayBadgeEn = day === "weekday" ? "Weekday" : "Holiday";
  const weekdayText = formatKoreanWeekday(state.now);
  weekdayEls.forEach((el) => {
    const text = state.locale === LOCALES.EN
      ? `${weekdayEn} (${dayBadgeEn})`
      : `${weekdayKo} (${dayBadgeKo})`;
    el.textContent = text;
  });
  weekdayCardEls.forEach((el) => {
    el.textContent = state.locale === LOCALES.EN ? weekdayEn : weekdayText;
  });
  if (weekdayBadge) {
    weekdayBadge.textContent = state.locale === LOCALES.EN ? dayBadgeEn : dayLabel;
  }
  applyThemeByPreference(state.now);
}

function renderServiceBadge() {
  const badge = document.querySelector("[data-service-badge]");
  if (!badge) return;
  const { day, labelKo, labelEn } = resolveServiceDay(state.now);
  state.serviceDay = day;
  const label = state.locale === LOCALES.EN ? labelEn : labelKo;
  state.holidayLabel = label;
  if (state.locale === LOCALES.EN) {
    const dayText = day === "weekday" ? "Weekday Service" : "Holiday Service";
    badge.textContent = `${dayText} · ${label}`;
    return;
  }
  badge.textContent = day === "weekday" ? `평일 운행 · ${label}` : `휴일 운행 · ${label}`;
}

function getVisibleNotices() {
  const noticeItems = notices.filter((notice) => !notice?.meta);
  const today = toIsoDate(state.now);
  return noticeItems.filter((notice) => {
    return (!notice.startDate || notice.startDate <= today) &&
      (!notice.endDate || notice.endDate >= today);
  });
}

function getTickerDefaultMessage() {
  const meta = notices.find((notice) => notice?.meta === "tickerDefault");
  const fallbackKo = "카이스트 버스 2.0에 오신 것을 환영합니다.";
  const fallbackEn = "Welcome to KAIST Bus 2.0.";
  if (!meta) return state.locale === LOCALES.EN ? fallbackEn : fallbackKo;
  return state.locale === LOCALES.EN
    ? meta.messageEn || fallbackEn
    : meta.message || fallbackKo;
}

function renderNotices() {
  const list = document.querySelector("#noticeList");
  if (!list) return;
  const visible = getVisibleNotices();

  list.innerHTML = visible.length
    ? visible
        .map(
          (notice) => `
          <article class="notice-card">
            <div class="notice-head">
              <span class="notice-tag">${state.locale === LOCALES.EN ? notice.tagEn || notice.tag || "Notice" : notice.tag || "공지"}</span>
              <h3>${state.locale === LOCALES.EN ? notice.titleEn || notice.title : notice.title}</h3>
            </div>
            <p>${state.locale === LOCALES.EN ? notice.bodyEn || notice.body : notice.body}</p>
            <span class="notice-date">${notice.startDate || ""}</span>
          </article>
        `
        )
        .join("")
    : `
        <div class="notice-empty">
          ${t(state.locale, "emptyNotice")}
        </div>
      `;
}

function renderNoticeTicker() {
  const ticker = document.querySelector("#noticeTicker");
  if (!ticker) return;
  const flashNoticeSection = () => {
    const target = document.querySelector("#notice");
    if (!target) return;
    target.classList.remove("notice-flash");
    // Force reflow to restart animation reliably.
    void target.offsetWidth;
    target.classList.add("notice-flash");
    window.setTimeout(() => target.classList.remove("notice-flash"), 1150);
  };

  const visible = getVisibleNotices();
  if (noticeTickerTimer) {
    clearInterval(noticeTickerTimer);
    noticeTickerTimer = null;
  }

  if (!visible.length) {
    ticker.textContent = getTickerDefaultMessage();
    ticker.classList.remove("is-fading", "is-switching");
    const goNoticeSection = () => {
      const target = document.querySelector("#notice");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(flashNoticeSection, 240);
      }
    };
    ticker.classList.add("is-link");
    ticker.setAttribute("role", "button");
    ticker.setAttribute("tabindex", "0");
    ticker.setAttribute("title", state.locale === LOCALES.EN ? "Go to notices" : "공지사항으로 이동");
    ticker.onclick = goNoticeSection;
    ticker.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      goNoticeSection();
    };
    if (noticeTickerFadeTimer) {
      clearTimeout(noticeTickerFadeTimer);
      noticeTickerFadeTimer = null;
    }
    if (noticeTickerSwapTimer) {
      clearTimeout(noticeTickerSwapTimer);
      noticeTickerSwapTimer = null;
    }
    return;
  }

  const buildText = () => {
    const item = visible[noticeTickerIndex % visible.length];
    const tag = state.locale === LOCALES.EN ? item.tagEn || item.tag || "Notice" : item.tag || "공지";
    const title = state.locale === LOCALES.EN ? item.titleEn || item.title : item.title;
    return `[${tag}] ${title}`;
  };

  const draw = (withFade = false) => {
    const nextText = buildText();
    if (!withFade) {
      ticker.textContent = nextText;
      syncTickerLink();
      return;
    }
    if (noticeTickerFadeTimer) clearTimeout(noticeTickerFadeTimer);
    if (noticeTickerSwapTimer) clearTimeout(noticeTickerSwapTimer);

    ticker.classList.add("is-switching");
    noticeTickerSwapTimer = setTimeout(() => {
      ticker.textContent = nextText;
      syncTickerLink();
    }, 120);

    noticeTickerFadeTimer = setTimeout(() => {
      ticker.classList.remove("is-switching");
      noticeTickerFadeTimer = null;
      noticeTickerSwapTimer = null;
    }, 240);
  };

  const goNoticeSection = () => {
    const target = document.querySelector("#notice");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(flashNoticeSection, 240);
    }
  };

  const syncTickerLink = () => {
    const item = visible[noticeTickerIndex % visible.length];
    const body = state.locale === LOCALES.EN ? item.bodyEn || item.body || "" : item.body || "";
    const fullText = `${buildText()} ${body ? `- ${body}` : ""}`.trim();
    ticker.textContent = fullText;
    ticker.classList.add("is-link");
    ticker.setAttribute("role", "button");
    ticker.setAttribute("tabindex", "0");
    ticker.setAttribute("title", state.locale === LOCALES.EN ? "Go to notices" : "공지사항으로 이동");
    ticker.onclick = goNoticeSection;
    ticker.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      goNoticeSection();
    };
  };

  draw(false);
  if (visible.length <= 1) {
    ticker.classList.remove("is-switching");
    return;
  }
  noticeTickerTimer = setInterval(() => {
    noticeTickerIndex = (noticeTickerIndex + 1) % visible.length;
    draw(true);
  }, 5000);
}

function renderRouteCards(routes, overrideQuery = null, overrideBase = null, isComposing = false) {
  const list = document.querySelector("#routeList");
  if (!list) return;
  const rawQuery = overrideQuery != null ? overrideQuery : state.routeSearch;
  const rawBase = overrideBase != null ? overrideBase : state.routeSearchBase;
  const isImeComposing = Boolean(isComposing);
  const isJamoInput = /[ㄱ-ㅎㅏ-ㅣ]/.test(rawQuery);
  const composingForFallback = isImeComposing;
  const composingForHighlight = isImeComposing && isJamoInput;
  let query = rawQuery.trim().toLowerCase();
  let effectiveQuery = query;
  let filtered = query
    ? routes.filter((route) => matchesQuery(getRouteSearchText(route), query))
    : routes;
  let usedFallback = false;
  if (composingForFallback && query && filtered.length === 0) {
    const fallbackQuery = (rawBase || state.routeSearchStable || "").trim().toLowerCase();
    const candidates = getSearchCandidates(routes, getRouteSearchText);
    const fallback = getCompositionFallback(rawQuery, candidates, fallbackQuery);
    if (fallback) {
      usedFallback = true;
      effectiveQuery = fallback;
      filtered = routes.filter((route) => {
        return matchesQuery(getRouteSearchText(route), effectiveQuery);
      });
    }
  }
  const nextKeys = filtered.map((route) => route.id).join("|");
  const highlightSource = resolveHighlightSource({
    rawQuery,
    effectiveQuery,
    filtered,
    isComposing: Boolean(isImeComposing)
  });
  if (!isImeComposing && effectiveQuery) {
    state.routeSearchStable = effectiveQuery;
  }
  if (!isImeComposing && !effectiveQuery) {
    state.routeSearchStable = "";
  }
  if (
    usedFallback &&
    composingForFallback &&
    state.routeSearchLastHtml &&
    state.routeSearchLastKeys === nextKeys &&
    state.routeSearchLastHighlight === highlightSource
  ) {
    applyRouteCardGlowStable();
    return;
  }
  if (!filtered.length) {
    if (usedFallback && composingForFallback && state.routeSearchLastHtml) {
      list.innerHTML = state.routeSearchLastHtml;
      applyRouteCardGlowStable();
      return;
    }
    list.innerHTML = `
      <div class="notice-empty">${t(state.locale, "noResults")}</div>
    `;
    return;
  }
  list.innerHTML = filtered
    .map((route) => {
      const displayQuery = highlightSource;
      return `
      <a class="route-card" data-glow-key="${route.id}" href="./route.html?route=${route.id}">
        <div>
          <h3>${highlightMatch(localizeRoute(route), displayQuery)}</h3>
          <p>${route.subtitle ? highlightMatch(route.subtitle, displayQuery) : ""}</p>
        </div>
        <div class="route-tags">
          ${(route.tags || []).map((tag) => `<span>${highlightMatch(tag, displayQuery)}</span>`).join("")}
        </div>
      </a>
    `;
    })
    .join("");
  state.routeSearchLastHtml = list.innerHTML;
  state.routeSearchLastKeys = nextKeys;
  state.routeSearchLastHighlight = highlightSource;
  applyRouteCardGlowStable();
}

function renderFavorites(routes) {
  const container = document.querySelector("#favoritesList");
  if (container) {
    container.innerHTML = "";
  }
  const dockPanel = document.querySelector("#favoriteDockPanel");
  const dock = document.querySelector("#favoriteDock");
  const tab = document.querySelector("[data-favorite-tab]");
  if (!dockPanel) return;
  let items = readFavorites();

  if (!items.length) {
    dockPanel.innerHTML = `
      <div class="favorite-dock__empty">
        즐겨찾기가 비어 있어요. 상단의 "즐겨찾기 추가" 버튼으로 등록해 주세요.
      </div>
    `;
    dockPanel.setAttribute("aria-live", "polite");
    if (dock) dock.classList.add("is-empty");
    if (tab) {
      const isOpen = dock?.classList.contains("is-open");
      tab.classList.toggle("is-active", Boolean(isOpen));
    }
    return;
  }
  if (dock) dock.classList.remove("is-empty");
  dockPanel.style.display = "";

  const nowMinutes = state.now.getHours() * 60 + state.now.getMinutes();
  const previewLimit = getFavoritePreviewLimit();
  const validItems = [];
  const entries = [];

  items.forEach((item) => {
    const route = mergedRoutes.find((r) => r.id === item.routeId);
    if (!route) return;
    const serviceDay = getEffectiveDayForStop(state.now, null, route);
    let stop = findStopForDay(route, item.stopId, serviceDay);
    if (isCampusLoop(route) && item.campusFrom) {
      stop = getCampusDepartureStop(
        { ...route, stops: getStopsForDay(route, serviceDay) },
        item.campusFrom,
        item.campusTo
      );
    }
    if (!stop) return;
    validItems.push(item);
    const favoriteDay = getEffectiveDayForStop(state.now, stop, route);
    const times = filterCampusLoopTimes(
      route,
      favoriteDay,
      stop.times?.[favoriteDay] || [],
      item.campusFrom,
      item.campusTo
    );
    const effectiveNow = favoriteDay !== getResolvedDay(state.now) && nowMinutes < CROSSOVER_MINUTES
      ? nowMinutes + 1440
      : nowMinutes;
    const remaining = getRemainingDeparturesUntilLast(times, effectiveNow - 2);
    const upcoming = remaining.slice(0, previewLimit);
    const lastTime = remaining[remaining.length - 1];
    const hiddenCount = Math.max(0, remaining.length - upcoming.length);
    const label = isCampusLoop(route) && item.campusFrom
      ? `${getCampusLabel(item.campusFrom)} → ${getCampusLabel(item.campusTo)}`
      : stop.direction && stop.direction !== route.name
        ? `${getStopShortName(route.id, localizeStop(stop))} → ${state.locale === LOCALES.EN ? stop.directionEn || stop.direction : stop.direction}`
        : `${getStopShortName(route.id, localizeStop(stop))}`;
    entries.push({
      item,
      route,
      stop,
      label,
      upcoming,
      lastTime,
      hiddenCount
    });
  });

  if (validItems.length !== items.length) {
    items = validItems;
    writeFavorites(validItems);
  }

  if (!entries.length) {
    dockPanel.innerHTML = `
      <div class="favorite-dock__empty">
        즐겨찾기가 비어 있어요. 상단의 "즐겨찾기 추가" 버튼으로 등록해 주세요.
      </div>
    `;
    if (dock) dock.classList.add("is-empty");
    if (tab) tab.classList.remove("is-active");
    return;
  }

  const cards = entries.map((entry, index) => {
    const isFirst = index === 0;
    const isLast = index === entries.length - 1;
    const jumpAttrs = [
      `data-jump-route="${entry.route.id}"`,
      `data-jump-stop="${entry.stop.id}"`,
      entry.item.campusFrom ? `data-jump-from="${entry.item.campusFrom}"` : "",
      entry.item.campusTo ? `data-jump-to="${entry.item.campusTo}"` : ""
    ]
      .filter(Boolean)
      .join(" ");
    return `
      <div class="favorite-dock__item" data-fav="${entry.item.key}" ${jumpAttrs}>
        <div class="favorite-dock__title">
          <span>${localizeRoute(entry.route)}</span>
          <span>${entry.label}</span>
        </div>
        <div class="favorite-dock__row">
          <div class="favorite-dock__times">
            ${
              entry.upcoming.length
                ? [
                    ...entry.upcoming.map(
                      (time) => `
                      <span>
                        ${time}
                        ${entry.lastTime && time === entry.lastTime ? `<em class="last-tag">${state.locale === LOCALES.EN ? "Last" : "막차"}</em>` : ""}
                      </span>
                    `
                    ),
                    entry.hiddenCount > 0 ? `<span class="favorite-dock__more">+${entry.hiddenCount}</span>` : ""
                  ].join("")
                : `<span class="favorite-dock__empty-text">미운행</span>`
            }
          </div>
          <div class="favorite-dock__actions">
            <button class="favorite-dock__move" type="button" data-move-favorite="up" data-key="${entry.item.key}" ${isFirst ? "disabled" : ""} aria-label="위로">
              ↑
            </button>
            <button class="favorite-dock__move" type="button" data-move-favorite="down" data-key="${entry.item.key}" ${isLast ? "disabled" : ""} aria-label="아래로">
              ↓
            </button>
            <button class="favorite-dock__remove" type="button" data-remove-favorite="${entry.item.key}">
              삭제
            </button>
          </div>
        </div>
      </div>
    `;
  });

  dockPanel.innerHTML = cards.join("");
}

function getRouteStop(route) {
  const fallback = route.stops.find((s) => s.default) || route.stops[0];
  return route.stops.find((s) => s.id === state.selectedStopId) || fallback;
}

function renderOriginOptions(destination) {
  const container = document.querySelector("#originPills");
  if (!container) return;
  const section = container.closest("section");
  const options = destination.stops
    .map((entry) => {
      const route = mergedRoutes.find((r) => r.id === entry.routeId);
      const stop = route?.stops.find((s) => s.id === entry.stopId);
      if (!route || !stop) return null;
      return {
        key: `${route.id}:${stop.id}`,
        route,
        stop
      };
    })
    .filter(Boolean);

  if (!options.length) {
    container.innerHTML = `<div class="notice-empty">선택한 목적지로 가는 정류장이 없습니다.</div>`;
    if (section) section.style.display = "block";
    return;
  }

  if (options.length === 1 && section) {
    section.style.display = "none";
  } else if (section) {
    section.style.display = "block";
  }

  if (!state.selectedRouteId || !state.selectedStopId) {
    state.selectedRouteId = options[0].route.id;
    state.selectedStopId = options[0].stop.id;
  }

  const shortName = (name) => {
    return name
      .replace(/^(본교\s*출발|본교\s*도착|본교출발|본교도착|시내\s*구간|시내구간|출발|도착)\s*/g, "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  container.innerHTML = options
    .map(
      (option) => `
      <button class="stop-pill ${option.stop.id === state.selectedStopId && option.route.id === state.selectedRouteId ? "is-active" : ""}" data-origin="${option.key}">
        <span class="pill-title">${shortName(localizeStop(option.stop)) || localizeStop(option.stop)}</span>
        <span class="pill-sub">${localizeRoute(option.route)}</span>
      </button>
    `
    )
    .join("");

  container.querySelectorAll("[data-origin]").forEach((button) => {
    button.addEventListener("click", () => {
      const [routeId, stopId] = button.dataset.origin.split(":");
      state.selectedRouteId = routeId;
      state.selectedStopId = stopId;
      renderNextDepartures(mergedRoutes);
    });
  });
}

function renderDestinations() {
  const container = document.querySelector("#destinationPills");
  if (!container) return;
  const presets = routePresetsData.routePresets;
  if (!state.selectedDestinationId && presets.length) {
    state.selectedDestinationId = presets[0].id;
  }

  container.innerHTML = presets
    .map(
      (dest) => `
      <button class="destination-pill ${dest.id === state.selectedDestinationId ? "is-active" : ""}" data-dest="${dest.id}">
        ${dest.name}
      </button>
    `
    )
    .join("");

  container.querySelectorAll("[data-dest]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDestinationId = button.dataset.dest;
      state.selectedRouteId = "";
      state.selectedStopId = "";
      renderNextDepartures(mergedRoutes);
    });
  });
}

function renderNextDepartures(routes) {
  const container = document.querySelector("#nextDepartures");
  if (!container) return;
  const previewLimit = getMainNextPreviewLimit();

  const favorites = readFavorites().slice(0, 3);
  if (!favorites.length) {
    container.innerHTML = `
      <div class="next-empty">
        ${state.locale === LOCALES.EN ? "No favorites yet. Add a favorite in route details to see upcoming buses here." : "즐겨찾기한 노선이 아직 없어요. 노선 상세에서 즐겨찾기를 추가하면 여기에서 가까운 출발을 빠르게 확인할 수 있어요."}
      </div>
    `;
    renderFavorites(routes);
    return;
  }

  const nowMinutes = state.now.getHours() * 60 + state.now.getMinutes();
  const cards = favorites
    .map((item) => {
      const route = mergedRoutes.find((r) => r.id === item.routeId);
      if (!route) return "";
      const serviceDay = getEffectiveDayForStop(state.now, null, route);
      let stop = findStopForDay(route, item.stopId, serviceDay);
      if (isCampusLoop(route) && item.campusFrom) {
        stop = getCampusDepartureStop(
          { ...route, stops: getStopsForDay(route, serviceDay) },
          item.campusFrom,
          item.campusTo
        );
      }
      if (!stop) return "";
      const effectiveDay = getEffectiveDayForStop(state.now, stop, route);
      const times = filterCampusLoopTimes(
        route,
        effectiveDay,
        stop.times?.[effectiveDay] || [],
        item.campusFrom,
        item.campusTo
      );
      if (!times.length) return "";
      const effectiveNow = effectiveDay !== getResolvedDay(state.now) && nowMinutes < CROSSOVER_MINUTES
        ? nowMinutes + 1440
        : nowMinutes;
      const remaining = getRemainingDeparturesUntilLast(times, effectiveNow - 2);
      const upcoming = remaining.slice(0, previewLimit);
      const hiddenCount = Math.max(0, remaining.length - upcoming.length);
      const lastTime = remaining[remaining.length - 1];
      const label = isCampusLoop(route) && item.campusFrom
        ? `${getCampusLabel(item.campusFrom)} → ${getCampusLabel(item.campusTo)}`
        : stop.direction && stop.direction !== route.name
          ? `${getStopShortName(route.id, localizeStop(stop))} → ${state.locale === LOCALES.EN ? stop.directionEn || stop.direction : stop.direction}`
          : `${getStopShortName(route.id, localizeStop(stop))}`;
      const jumpAttrs = [
        `data-jump-route="${route.id}"`,
        `data-jump-stop="${stop.id}"`,
        item.campusFrom ? `data-jump-from="${item.campusFrom}"` : "",
        item.campusTo ? `data-jump-to="${item.campusTo}"` : ""
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <div class="next-card" data-glow-key="${item.key}" ${jumpAttrs} role="button" tabindex="0">
          <div class="next-header">
            <div>
              <h3>${localizeRoute(route)}</h3>
              <p>${label}</p>
            </div>
          </div>
          <div class="next-list">
            ${[
              ...upcoming.map((time) => `
                <div class="next-chip">
                  ${time}
                  ${lastTime && time === lastTime ? `<span class="last-tag">${state.locale === LOCALES.EN ? "Last" : "막차"}</span>` : ""}
                </div>
              `)
              ,
              hiddenCount > 0 ? `<div class="next-chip next-chip--more">+${hiddenCount}</div>` : ""
            ].join("")}
          </div>
          <p class="next-note">${t(state.locale, "realtimeNotice")}</p>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  container.innerHTML = cards || `
    <div class="next-empty">
      ${state.locale === LOCALES.EN ? "No favorites yet. Add a favorite in route details to see upcoming buses here." : "즐겨찾기한 노선이 아직 없어요. 노선 상세에서 즐겨찾기를 추가하면 여기에서 가까운 출발을 빠르게 확인할 수 있어요."}
    </div>
  `;

  container.onclick = (event) => {
    const card = event.target.closest("[data-jump-route]");
    if (!card) return;
    const href = buildRouteHref({
      routeId: card.dataset.jumpRoute,
      stopId: card.dataset.jumpStop,
      campusFrom: card.dataset.jumpFrom,
      campusTo: card.dataset.jumpTo
    });
    window.location.href = href;
  };

  container.onkeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-jump-route]");
    if (!card) return;
    event.preventDefault();
    const href = buildRouteHref({
      routeId: card.dataset.jumpRoute,
      stopId: card.dataset.jumpStop,
      campusFrom: card.dataset.jumpFrom,
      campusTo: card.dataset.jumpTo
    });
    window.location.href = href;
  };

  renderFavorites(routes);
  applyRandomCardGlow();
}

function setupThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    const isNight = document.body.classList.contains("theme-night");
    setThemePreference(isNight ? "light" : "dark");
    applyThemeByPreference(new Date());
    state.glowLocked = false;
    if (!isNight) {
      ensureRouteGlowCache(getRouteExploreList());
    }
    lockCardGlow();
  });
  applyThemeByPreference(new Date());
}

function applyLocale() {
  applyStaticI18n(state.locale);
  const footerUpdate = document.querySelector("#footerUpdateMain");
  if (footerUpdate) {
    const fallbackNow = new Date();
    const raw = typeof BUILD_DATE === "string" ? BUILD_DATE.trim() : "";
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
    const year = match ? Number(match[1]) : fallbackNow.getFullYear();
    const month = match ? Number(match[2]) : fallbackNow.getMonth() + 1;
    const day = match ? Number(match[3]) : fallbackNow.getDate();
    const hour = match ? Number(match[4] || "0") : fallbackNow.getHours();
    const minute = match ? Number(match[5] || "0") : fallbackNow.getMinutes();
    if (state.locale === LOCALES.EN) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      footerUpdate.textContent = `(Updated: ${monthNames[Math.max(0, Math.min(11, month - 1))]} ${day}, ${year}, ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")})`;
    } else {
      footerUpdate.textContent = `(${year}년 ${month}월 ${day}일 ${String(hour).padStart(2, "0")}시 ${String(minute).padStart(2, "0")}분 업데이트)`;
    }
  }
  const toggle = document.querySelector("[data-locale-toggle]");
  if (toggle) {
    toggle.textContent = state.locale.toUpperCase();
  }
}

function setupLocaleToggle() {
  const button = document.querySelector("[data-locale-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    state.locale = setLocale(state.locale === LOCALES.KO ? LOCALES.EN : LOCALES.KO);
    applyLocale();
    renderTime();
    renderNotices();
    renderNoticeTicker();
    renderRouteCards(getRouteExploreList());
    renderNextDepartures(mergedRoutes);
    renderFavorites(getRoutesForDay(state.serviceDay));
  });
}

function setupFavoriteDock() {
  const dock = document.querySelector("#favoriteDock");
  const tab = document.querySelector("[data-favorite-tab]");
  const panel = document.querySelector("#favoriteDockPanel");
  if (!dock || !tab) return;

  let pinned = false;
  let closeTimer = null;

  const syncActive = () => {
    tab.classList.toggle("is-active", dock.classList.contains("is-open"));
  };

  const openDock = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    dock.classList.add("is-open");
    syncActive();
    positionDock();
  };
  const closeDock = () => {
    if (!pinned) {
      dock.classList.remove("is-open");
      syncActive();
    }
  };
  const scheduleCloseDock = () => {
    if (pinned) return;
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (pinned) return;
      const isHovering = tab.matches(":hover") || dock.matches(":hover") || panel?.matches(":hover");
      if (!isHovering) closeDock();
    }, 140);
  };

  dock.addEventListener("mouseenter", () => openDock());
  dock.addEventListener("mouseleave", () => scheduleCloseDock());
  tab.addEventListener("mouseenter", () => openDock());
  tab.addEventListener("mouseleave", () => scheduleCloseDock());
  dock.addEventListener("click", () => {
    pinned = !pinned;
    if (pinned) {
      dock.classList.add("is-open");
      syncActive();
    } else {
      dock.classList.remove("is-open");
      syncActive();
    }
  });

  tab.addEventListener("click", () => {
    pinned = !pinned;
    if (pinned) {
      dock.classList.add("is-open");
      syncActive();
    } else {
      dock.classList.remove("is-open");
      syncActive();
    }
  });

  const positionDock = () => {
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    if (!isMobile || !dock.classList.contains("is-open")) return;
    const rect = tab.getBoundingClientRect();
    dock.style.top = `${Math.round(rect.bottom + 8)}px`;
  };

  document.addEventListener("click", (event) => {
    if (!dock.classList.contains("is-open")) return;
    if (dock.contains(event.target) || tab.contains(event.target)) return;
    pinned = false;
    dock.classList.remove("is-open");
    syncActive();
  });

  if (panel) {
    panel.addEventListener("mouseenter", () => openDock());
    panel.addEventListener("mouseleave", () => scheduleCloseDock());
    panel.addEventListener("click", (event) => {
      event.stopPropagation();
      const moveButton = event.target.closest("[data-move-favorite]");
      if (moveButton) {
        const key = moveButton.dataset.key;
        const direction = moveButton.dataset.moveFavorite;
        if (!key || !direction) return;
        const items = readFavorites();
        const index = items.findIndex((item) => item.key === key);
        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
        const reordered = items.slice();
        [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
        writeFavorites(reordered);
        renderFavorites(getRoutesForDay(state.serviceDay));
        return;
      }
      const button = event.target.closest("[data-remove-favorite]");
      if (!button) return;
      const key = button.dataset.removeFavorite;
      if (!key) return;
      const items = readFavorites().filter((item) => item.key !== key);
      writeFavorites(items);
      renderFavorites(getRoutesForDay(state.serviceDay));
    });
    panel.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-favorite]");
      if (removeButton) return;
      const moveButton = event.target.closest("[data-move-favorite]");
      if (moveButton) return;
      const item = event.target.closest("[data-jump-route]");
      if (!item) return;
      const href = buildRouteHref({
        routeId: item.dataset.jumpRoute,
        stopId: item.dataset.jumpStop,
        campusFrom: item.dataset.jumpFrom,
        campusTo: item.dataset.jumpTo
      });
      window.location.href = href;
    });
  }

  syncActive();
  window.addEventListener("scroll", positionDock, { passive: true });
  window.addEventListener("resize", positionDock);
  tab.addEventListener("click", positionDock);
  dock.addEventListener("mouseenter", positionDock);
}

function updateNavbarWrap() {
  const header = document.querySelector("header.navbar");
  const brand = header?.querySelector(".brand");
  const nav = header?.querySelector(".primary-nav");
  const navLinks = nav?.querySelector(".nav-links");
  const navActions = nav?.querySelector(".nav-actions");
  if (!header || !brand || !nav) return;
  const wasWrapped = header.classList.contains("is-wrapped");
  if (wasWrapped) {
    header.classList.remove("is-wrapped");
  }
  if (!navLinks || !navActions) return;
  const linkWraps = Array.from(navLinks.children).some(
    (link) => link.scrollHeight > link.clientHeight + 2
  );
  const actionWraps = Array.from(navActions.children).some(
    (button) => button.scrollHeight > button.clientHeight + 2
  );
  const headerGap = parseFloat(getComputedStyle(header).gap || "0") || 0;
  const navGap = parseFloat(getComputedStyle(nav).gap || "0") || 0;
  const measureGroup = (group) => {
    const children = Array.from(group.children);
    if (!children.length) return 0;
    const groupGap = parseFloat(getComputedStyle(group).gap || "0") || 0;
    const width = children.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);
    return width + groupGap * (children.length - 1);
  };
  const requiredNav = measureGroup(navLinks) + measureGroup(navActions) + navGap;
  const availableNav = header.clientWidth - brand.getBoundingClientRect().width - headerGap;
  const linksRect = navLinks.getBoundingClientRect();
  const actionsRect = navActions.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  const headerRect = header.getBoundingClientRect();
  const brandRect = brand.getBoundingClientRect();
  const overlap = linksRect.right > actionsRect.left - 8;
  const overlapBrand = navRect.left < brandRect.right + 8;
  const overflowRight = navRect.right > headerRect.right - 8;
  const widthOverflow = requiredNav > availableNav - NAV_WRAP_SLACK;
  const shouldWrap = linkWraps || actionWraps || overlap || overlapBrand || overflowRight || widthOverflow;
  header.classList.toggle("is-wrapped", shouldWrap);
}

function setupNavbarWrap() {
  updateNavbarWrap();
  window.addEventListener("resize", updateNavbarWrap);
  window.addEventListener("load", updateNavbarWrap);
  if (document.fonts?.ready) {
    document.fonts.ready.then(updateNavbarWrap);
  }
}

function setupRouteSearch() {
  const input = document.querySelector("#routeSearch");
  const recent = document.querySelector("#routeSearchRecent");
  const clearButton = document.querySelector(".search-clear");
  if (!input) return;
  input.value = state.routeSearch;
  const syncClear = () => {
    if (!clearButton) return;
    clearButton.classList.toggle("is-visible", Boolean(input.value));
  };
  const renderRecent = () => {
    if (!recent) return;
    const items = readRecentSearches("route");
    if (!items.length) {
      recent.innerHTML = `
        <div class="search-recent__label">${t(state.locale, "recentSearch")}</div>
      `;
      return;
    }
    recent.innerHTML = `
      <div class="search-recent__label">${t(state.locale, "recentSearch")}</div>
      <div class="search-recent__items">
        ${items
          .map(
            (item) => `<button type="button" class="search-chip" data-recent="${escapeHtml(item)}">${escapeHtml(item)}</button>`
          )
          .join("")}
      </div>
    `;
  };
  renderRecent();
  syncClear();
  input.addEventListener("compositionstart", () => {
    state.routeSearchComposing = true;
    state.routeSearchBase = state.routeSearch;
  });
  input.addEventListener("compositionend", () => {
    state.routeSearchComposing = false;
    state.routeSearch = input.value;
    renderRouteCards(getRouteExploreList(), input.value, state.routeSearchBase, false);
    syncClear();
  });
  input.addEventListener("compositionupdate", () => {
    renderRouteCards(getRouteExploreList(), input.value, state.routeSearchBase, true);
  });
  input.addEventListener("input", () => {
    state.routeSearch = input.value;
    if (state.routeSearchComposing) {
      renderRouteCards(getRouteExploreList(), input.value, state.routeSearchBase, true);
      syncClear();
      return;
    }
    renderRouteCards(getRouteExploreList(), input.value, state.routeSearchBase, false);
    syncClear();
  });
  input.addEventListener("focus", () => {
    state.routeSearchActive = true;
  });
  input.addEventListener("blur", () => {
    state.routeSearchActive = false;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    addRecentSearch("route", input.value);
    renderRecent();
    syncClear();
  });
  input.addEventListener("blur", () => {
    addRecentSearch("route", input.value);
    renderRecent();
    syncClear();
  });
  if (recent) {
    recent.addEventListener("click", (event) => {
      const button = event.target.closest("[data-recent]");
      if (!button) return;
      input.value = button.dataset.recent || "";
      state.routeSearch = input.value;
      renderRouteCards(getRouteExploreList(), input.value, state.routeSearchBase, false);
      syncClear();
    });
  }
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      input.value = "";
      state.routeSearch = "";
      state.routeSearchBase = "";
      renderRouteCards(getRouteExploreList(), "", "", false);
      syncClear();
      input.focus();
    });
  }
}

function isUserSelectingText() {
  const selection = window.getSelection?.();
  if (!selection) return false;
  return !selection.isCollapsed && selection.toString().trim().length > 0;
}

function boot() {
  const { day } = resolveServiceDay(state.now);
  state.serviceDay = day;

  const routes = getRoutesForDay(state.serviceDay);
  if (routes.length === 0) return;

  const favorites = readFavorites();
  if (favorites.length) {
    state.selectedRouteId = favorites[0].routeId;
    state.selectedStopId = favorites[0].stopId;
    const route = mergedRoutes.find((r) => r.id === state.selectedRouteId);
    const stop = route?.stops.find((s) => s.id === state.selectedStopId);
    const destination = routePresetsData.routePresets.find((d) => d.name === stop?.direction);
    if (destination) {
      state.selectedDestinationId = destination.id;
    }
  } else {
    state.selectedRouteId = pickDefaultRoute(routes).id;
  }
  applyLocale();
  renderTime();
  renderNotices();
  renderNoticeTicker();
  if (window.location.hash === "#notice") {
    window.setTimeout(() => {
      const target = document.querySelector("#notice");
      if (!target) return;
      target.classList.remove("notice-flash");
      void target.offsetWidth;
      target.classList.add("notice-flash");
      window.setTimeout(() => target.classList.remove("notice-flash"), 1150);
    }, 220);
  }
  window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#notice") return;
    const target = document.querySelector("#notice");
    if (!target) return;
    target.classList.remove("notice-flash");
    void target.offsetWidth;
    target.classList.add("notice-flash");
    window.setTimeout(() => target.classList.remove("notice-flash"), 1150);
  });
  const exploreRoutes = getRouteExploreList();
  ensureRouteGlowCache(exploreRoutes);
  renderRouteCards(exploreRoutes);
  renderNextDepartures(mergedRoutes);
  lockCardGlow();
  setupThemeToggle();
  setupLocaleToggle();
  setupFavoriteDock();
  setupRouteSearch();
  setupNavbarWrap();

  let lastMinuteKey = "";
  setInterval(() => {
    renderTime();
    if (state.routeSearchActive) {
      return;
    }
    const minuteKey = `${toIsoDate(state.now)}-${state.now.getHours()}-${state.now.getMinutes()}`;
    if (!isUserSelectingText() && minuteKey !== lastMinuteKey) {
      lastMinuteKey = minuteKey;
      renderNotices();
      renderNoticeTicker();
      renderNextDepartures(mergedRoutes);
    }
  }, 1000);
}

boot();



