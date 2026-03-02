import routesData from "./data/routes.json";
import holidays from "./data/holidays.json";
import notices from "./data/notices.json";
import {
  formatClockWithSeconds,
  formatKoreanDate,
  formatKoreanWeekday,
  isWeekend,
  minutesToTime,
  timeToMinutes,
  toIsoDate
} from "./utils/time.js";
import { getStopShortName } from "./utils/stopLabels.js";
import { escapeHtml, matchesQuery, highlightMatch } from "./utils/search.js";
import { getCompositionFallback } from "./utils/imeSearch.js";
import { readRecentSearches, addRecentSearch } from "./utils/recentSearch.js";
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
const CAMPUS_OPTIONS = [
  { id: "main", label: "본교", labelEn: "Main", match: /본교|main/i },
  { id: "munji", label: "문지", labelEn: "Munji", match: /문지|munji/i },
  { id: "hwaam", label: "화암", labelEn: "Hwaam", match: /화암|hwaam/i }
];

const state = {
  now: new Date(),
  serviceDay: "weekday",
  serviceOverride: null,
  routeId: "",
  stopId: "",
  campusFrom: "main",
  campusTo: "munji",
  stopPillsExpanded: false,
  dropdownOpen: false,
  favoriteHelpVisible: false,
  sharedFromLink: false,
  routeSearch: "",
  stopSearch: "",
  keepSearchFocus: null,
  locale: getInitialLocale()
};

const dropdownRegistry = new Map();
const NAV_WRAP_SLACK = 12;
const BUILD_DATE = typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "";
const CROSSOVER_MINUTES = 4 * 60;
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

function getVisibleNotices() {
  const noticeItems = notices.filter((notice) => !notice?.meta);
  const nowDate = toIsoDate(state.now);
  return noticeItems.filter((notice) => {
    const start = notice.startDate || "0000-01-01";
    const end = notice.endDate || "9999-12-31";
    return nowDate >= start && nowDate <= end;
  });
}

function getTickerDefaultMessage() {
  const meta = notices.find((notice) => notice?.meta === "tickerDefault");
  if (!meta) {
    return state.locale === LOCALES.EN
      ? "Welcome to KAIST BUS 2.0."
      : "카이스트 버스 2.0에 오신 것을 환영합니다.";
  }
  return state.locale === LOCALES.EN
    ? meta.messageEn || meta.message || "Welcome to KAIST BUS 2.0."
    : meta.message || meta.messageEn || "카이스트 버스 2.0에 오신 것을 환영합니다.";
}

function renderNoticeTicker() {
  const ticker = document.querySelector("#noticeTicker");
  if (!ticker) return;

  if (noticeTickerTimer) {
    clearInterval(noticeTickerTimer);
    noticeTickerTimer = null;
  }
  if (noticeTickerFadeTimer) {
    clearTimeout(noticeTickerFadeTimer);
    noticeTickerFadeTimer = null;
  }
  if (noticeTickerSwapTimer) {
    clearTimeout(noticeTickerSwapTimer);
    noticeTickerSwapTimer = null;
  }

  const visible = getVisibleNotices();
  const goNoticeSection = () => {
    window.location.href = "./index.html#notice";
  };
  const applyClickable = () => {
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

  if (!visible.length) {
    ticker.textContent = getTickerDefaultMessage();
    ticker.classList.remove("is-switching");
    applyClickable();
    return;
  }

  const buildText = () => {
    const item = visible[noticeTickerIndex % visible.length];
    const tag = state.locale === LOCALES.EN ? item.tagEn || item.tag || "Notice" : item.tag || "공지";
    const title = state.locale === LOCALES.EN ? item.titleEn || item.title : item.title;
    const body = state.locale === LOCALES.EN ? item.bodyEn || item.body || "" : item.body || "";
    return `[${tag}] ${title}${body ? ` - ${body}` : ""}`;
  };

  const draw = (withFade = false) => {
    const text = buildText();
    if (!withFade) {
      ticker.textContent = text;
      applyClickable();
      return;
    }
    ticker.classList.add("is-switching");
    noticeTickerSwapTimer = setTimeout(() => {
      ticker.textContent = text;
      applyClickable();
    }, 120);
    noticeTickerFadeTimer = setTimeout(() => {
      ticker.classList.remove("is-switching");
      noticeTickerFadeTimer = null;
      noticeTickerSwapTimer = null;
    }, 240);
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

function setDropdownOpen(isOpen) {
  state.dropdownOpen = isOpen;
}

function isAnyDropdownFocused() {
  const active = document.activeElement;
  if (!active) return false;
  for (const entry of dropdownRegistry.values()) {
    if (entry.searchInput && entry.searchInput === active) return true;
    if (entry.wrapper && entry.wrapper.contains(active)) return true;
  }
  return false;
}

function closeAllDropdowns() {
  dropdownRegistry.forEach((entry) => {
    if (entry.open) {
      entry.close();
    }
  });
}

function ensureDropdown(select) {
  if (dropdownRegistry.has(select)) {
    const existing = dropdownRegistry.get(select);
    if (!existing.wrapper.isConnected || existing.wrapper.previousSibling !== select) {
      select.after(existing.wrapper);
    }
    return existing;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "dropdown";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dropdown__button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  const label = document.createElement("span");
  label.className = "dropdown__label";
  const chevron = document.createElement("span");
  chevron.className = "dropdown__chevron";
  button.append(label, chevron);

  const list = document.createElement("div");
  list.className = "dropdown__list";
  list.setAttribute("role", "listbox");
  list.tabIndex = -1;

  wrapper.append(button, list);
  select.after(wrapper);
  select.classList.add("native-select");
  select.setAttribute("aria-hidden", "true");
  select.tabIndex = -1;

  const entry = {
    wrapper,
    button,
    label,
    list,
    optionsKey: "",
    options: [],
    activeIndex: 0,
    open: false,
    suppressCloseUntil: 0,
    pendingClose: false,
    openDropdown() {
      if (entry.open) return;
      closeAllDropdowns();
      entry.open = true;
      wrapper.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      setDropdownOpen(true);
      entry.syncActiveIndex();
      list.tabIndex = -1;
      entry.suppressCloseUntil = performance.now() + 500;
      const isAndroid = /Android/i.test(navigator.userAgent || "");
      if (entry.searchInput && !isAndroid) {
        entry.searchInput.focus();
      }
    },
    close() {
      if (!entry.open) return;
      entry.open = false;
      wrapper.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      list.tabIndex = -1;
      button.focus();
      const anyOpen = Array.from(dropdownRegistry.values()).some((item) => item.open);
      setDropdownOpen(anyOpen);
    },
    syncActiveIndex() {
      const selectedIndex = select.selectedIndex >= 0 ? select.selectedIndex : 0;
      entry.setActive(selectedIndex);
    },
    setActive(index) {
      if (!entry.options.length) return;
      const next = Math.max(0, Math.min(index, entry.options.length - 1));
      entry.activeIndex = next;
      entry.options.forEach((option, idx) => {
        const isActive = idx === next;
        option.classList.toggle("is-active", isActive);
        option.setAttribute("aria-selected", isActive ? "true" : "false");
        if (isActive) {
          option.scrollIntoView({ block: "nearest" });
        }
      });
    }
  };

  wrapper.addEventListener("pointerdown", () => {
    entry.ignoreDocumentClick = true;
    window.setTimeout(() => {
      entry.ignoreDocumentClick = false;
    }, 0);
  });

  list.addEventListener("pointerdown", () => {
    entry.ignoreDocumentClick = true;
    window.setTimeout(() => {
      entry.ignoreDocumentClick = false;
    }, 0);
  });

  button.addEventListener("click", () => {
    if (entry.open) {
      entry.close();
    } else {
      entry.openDropdown();
    }
  });

  button.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!entry.open) {
        entry.openDropdown();
        return;
      }
      entry.setActive(entry.activeIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (entry.open && event.key === "Enter") {
      event.preventDefault();
      const option = entry.options[entry.activeIndex];
      if (option) {
        select.value = option.dataset.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        entry.close();
      }
      return;
    }
    if (entry.open && event.key === "Escape") {
      event.preventDefault();
      entry.close();
    }
  });

  list.addEventListener("click", (event) => {
    const option = event.target.closest(".dropdown__option");
    if (!option) return;
    const value = option.dataset.value;
    if (value != null) {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      entry.close();
    }
  });

  list.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      entry.close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      entry.setActive(entry.activeIndex + 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      entry.setActive(entry.activeIndex - 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = entry.options[entry.activeIndex];
      if (option) {
        select.value = option.dataset.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        entry.close();
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (!entry.open) return;
    if (/Android/i.test(navigator.userAgent || "")) return;
    if (performance.now() < entry.suppressCloseUntil) return;
    if (entry.ignoreDocumentClick) return;
    const path = event.composedPath ? event.composedPath() : [];
    const inside = path.length ? path.includes(wrapper) : wrapper.contains(event.target);
    if (inside) return;
    entry.close();
  });

  dropdownRegistry.set(select, entry);
  return entry;
}

function syncDropdown(select, overrideSearchValue = null) {
  const entry = ensureDropdown(select);
  const isHidden = select.hidden || select.style.display === "none" || select.classList.contains("is-hidden");
  entry.wrapper.style.display = isHidden ? "none" : "";
  entry.button.disabled = select.disabled;
  entry.button.setAttribute("aria-disabled", select.disabled ? "true" : "false");

  const useSearch = select.id === "routeSelect" || select.id === "stopSelect";
  const searchKey = useSearch ? select.id : "";
  const options = Array.from(select.options).map((option) => ({
    value: option.value,
    label: option.textContent
  }));
  const fallbackValue =
    select.id === "routeSelect" ? state.routeSearch : select.id === "stopSelect" ? state.stopSearch : "";
  const searchValue = overrideSearchValue != null ? overrideSearchValue : fallbackValue;
  const key = [
    searchKey,
    options.map((opt) => `${opt.value}:${opt.label}`).join("|")
  ].join("|");

  if (key !== entry.optionsKey) {
    entry.optionsKey = key;
    if (useSearch) {
      if (!entry.searchWrap) {
        const searchWrap = document.createElement("div");
        searchWrap.className = "dropdown__search";
        const searchInput = document.createElement("input");
        searchInput.type = "search";
        searchInput.className = "dropdown__search-input";
        searchInput.placeholder = select.id === "routeSelect" ? t(state.locale, "routeSearch") : t(state.locale, "stopSearch");
        searchInput.addEventListener("pointerdown", () => {
          entry.ignoreDocumentClick = true;
        });
        searchInput.addEventListener("focus", () => {
          entry.suppressCloseUntil = performance.now() + 500;
        });
        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.className = "search-clear search-clear--dropdown";
        clearButton.setAttribute("aria-label", t(state.locale, "searchClear"));
        clearButton.textContent = "×";
        const syncClear = () => {
          clearButton.classList.toggle("is-visible", Boolean(searchInput.value));
        };
        searchInput.addEventListener("compositionstart", () => {
          entry.isComposing = true;
          entry.compositionBase =
            select.id === "routeSelect" ? state.routeSearch : state.stopSearch;
        });
        searchInput.addEventListener("compositionupdate", () => {
          syncDropdown(select, searchInput.value);
          syncClear();
        });
        searchInput.addEventListener("compositionend", () => {
          entry.isComposing = false;
          if (select.id === "routeSelect") {
            state.routeSearch = searchInput.value;
          } else {
            state.stopSearch = searchInput.value;
          }
          entry.compositionBase = "";
          syncDropdown(select, searchInput.value);
          syncClear();
        });
        searchInput.addEventListener("input", () => {
          if (entry.isComposing) {
            syncDropdown(select, searchInput.value);
            syncClear();
            return;
          }
          if (select.id === "routeSelect") {
            state.routeSearch = searchInput.value;
          } else {
            state.stopSearch = searchInput.value;
          }
          syncDropdown(select, searchInput.value);
          syncClear();
        });
        searchInput.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          const scope = select.id === "routeSelect" ? "route" : "stop";
          addRecentSearch(scope, searchInput.value);
          syncDropdown(select, searchInput.value);
          syncClear();
        });
        clearButton.addEventListener("click", () => {
          searchInput.value = "";
          if (select.id === "routeSelect") {
            state.routeSearch = "";
          } else {
            state.stopSearch = "";
          }
          entry.compositionBase = "";
          syncDropdown(select, "");
          syncClear();
          searchInput.focus();
        });
        searchWrap.append(searchInput);
        searchWrap.append(clearButton);
        entry.searchWrap = searchWrap;
        entry.searchInput = searchInput;
        entry.searchClear = clearButton;
      }
      if (!entry.isComposing && document.activeElement !== entry.searchInput) {
        entry.searchInput.value = searchValue || "";
      }
      if (entry.searchClear) {
        entry.searchClear.classList.toggle("is-visible", Boolean(entry.searchInput.value));
      }
      if (!entry.recentWrap) {
        entry.recentWrap = document.createElement("div");
        entry.recentWrap.className = "dropdown__recent";
        entry.recentWrap.addEventListener("click", (event) => {
          event.stopPropagation();
          entry.ignoreDocumentClick = true;
          const button = event.target.closest("[data-recent]");
          if (!button) return;
          const value = button.dataset.recent || "";
          if (select.id === "routeSelect") {
            state.routeSearch = value;
          } else {
            state.stopSearch = value;
          }
          syncDropdown(select, value);
        });
      }
      if (!entry.optionsContainer) {
        entry.optionsContainer = document.createElement("div");
      }
      entry.list.replaceChildren(entry.searchWrap, entry.recentWrap, entry.optionsContainer);
    } else {
      entry.list.innerHTML = "";
      entry.optionsContainer = entry.list;
    }

    entry.optionsContainer.innerHTML = "";
      entry.options = options.map((option, idx) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dropdown__option";
        button.setAttribute("role", "option");
        button.dataset.value = option.value;
        button.dataset.label = option.label;
        button.addEventListener("mouseenter", () => {
          entry.setActive(idx);
        });
        entry.optionsContainer.append(button);
        return button;
      });
  }

  const applyFilter = (query, highlightQuery = query) => {
    if (!entry.optionsContainer) return;
    let visibleCount = 0;
    entry.options.forEach((button) => {
      const label = button.dataset.label || "";
      const matched = query ? matchesQuery(label, query) : true;
      button.style.display = matched ? "" : "none";
      if (matched) {
        button.innerHTML = highlightMatch(label, highlightQuery);
        visibleCount += 1;
      }
    });
    const empty = entry.optionsContainer.querySelector(".dropdown__empty");
    if (!visibleCount) {
      if (!empty) {
        const emptyNode = document.createElement("div");
        emptyNode.className = "dropdown__empty";
        emptyNode.textContent = t(state.locale, "noResults");
        entry.optionsContainer.append(emptyNode);
      }
    } else if (empty) {
      empty.remove();
    }
    return visibleCount;
  };

  if (useSearch && entry.searchInput && !entry.isComposing) {
    if (document.activeElement !== entry.searchInput && entry.searchInput.value !== (searchValue || "")) {
      entry.searchInput.value = searchValue || "";
    }
  }

  if (useSearch && entry.recentWrap) {
    const scope = select.id === "routeSelect" ? "route" : "stop";
    const recent = readRecentSearches(scope);
    entry.recentWrap.innerHTML = recent.length
      ? `
        <div class="dropdown__recent-label">${t(state.locale, "recentSearch")}</div>
        <div class="dropdown__recent-items">
          ${recent.map((item) => `<button type="button" class="dropdown__recent-chip" data-recent="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
        </div>
      `
      : `
        <div class="dropdown__recent-label">${t(state.locale, "recentSearch")}</div>
      `;
  }
  const highlightSource = entry.isComposing ? searchValue || "" : searchValue || "";
  const primaryCount = applyFilter(searchValue || "", highlightSource);
  if (entry.isComposing && (!primaryCount || primaryCount === 0)) {
    const rawQuery = searchValue || "";
    const fallback = getCompositionFallback(rawQuery, options.map((option) => option.label || ""), entry.compositionBase);
    if (fallback) {
      applyFilter(fallback, entry.isComposing ? fallback : rawQuery);
    }
  }

  const selectedIndex = select.selectedIndex >= 0 ? select.selectedIndex : 0;
  entry.label.textContent = options[selectedIndex]?.label || "";
  entry.setActive(selectedIndex);

}

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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


function renderFavoriteDock(route) {
  const panel = document.querySelector("#favoriteDockPanel");
  const dock = document.querySelector("#favoriteDock");
  const tab = document.querySelector("[data-favorite-tab]");
  if (!panel) return;

  const items = readFavorites();
  if (!items.length) {
    panel.innerHTML = `
      <div class="favorite-dock__empty">
        ${t(state.locale, "emptyFavorites")}
      </div>
    `;
    if (dock) dock.classList.add("is-empty");
    if (tab) {
      const isOpen = dock?.classList.contains("is-open");
      tab.classList.toggle("is-active", Boolean(isOpen));
    }
    return;
  }

  if (dock) dock.classList.remove("is-empty");

  const nowMinutes = state.now.getHours() * 60 + state.now.getMinutes();
  const previewLimit = getFavoritePreviewLimit();
  const entries = [];
  const validItems = [];

  items.forEach((item) => {
    const itemRoute = mergedRoutes.find((r) => r.id === item.routeId);
    if (!itemRoute) return;
    const serviceDay = getEffectiveDayForStop(state.now, null, itemRoute);
    let stop = findStopForDay(itemRoute, item.stopId, serviceDay);
    if (isCampusLoop(itemRoute) && item.campusFrom) {
      stop = getCampusDepartureStop(
        { ...itemRoute, stops: getStopsForDay(itemRoute, serviceDay) },
        item.campusFrom,
        item.campusTo
      );
    }
    if (!stop) return;
    validItems.push(item);
    const favoriteDay = getEffectiveDayForStop(state.now, stop, itemRoute);
    const times = filterCampusLoopTimes(
      itemRoute,
      favoriteDay,
      stop.times?.[favoriteDay] || [],
      item.campusFrom,
      item.campusTo
    );
    const effectiveNow = getEffectiveNowMinutes(state.now, favoriteDay);
    const remaining = getRemainingDeparturesUntilLast(times, effectiveNow - 2);
    const upcoming = remaining.slice(0, previewLimit);
    const lastTime = remaining[remaining.length - 1];
    const hiddenCount = Math.max(0, remaining.length - upcoming.length);
    const label = isCampusLoop(itemRoute) && item.campusFrom
      ? `${getCampusLabel(item.campusFrom)} → ${getCampusLabel(item.campusTo)}`
      : stop.direction && stop.direction !== itemRoute.name
        ? `${getStopShortName(itemRoute.id, localizeStop(stop))} → ${localizeRoute({ name: stop.direction, nameEn: stop.directionEn })}`
        : `${getStopShortName(itemRoute.id, localizeStop(stop))}`;
    entries.push({
      item,
      route: itemRoute,
      stop,
      label,
      upcoming,
      lastTime,
      hiddenCount
    });
  });

  if (validItems.length !== items.length) {
    writeFavorites(validItems);
  }

  if (!entries.length) {
    panel.innerHTML = `
      <div class="favorite-dock__empty">
        ${t(state.locale, "emptyFavorites")}
      </div>
    `;
    if (dock) dock.classList.add("is-empty");
    if (tab) {
      const isOpen = dock?.classList.contains("is-open");
      tab.classList.toggle("is-active", Boolean(isOpen));
    }
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
      <div class="favorite-dock__item" ${jumpAttrs}>
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
                        ${entry.lastTime && time === entry.lastTime ? `<em class="last-tag">${t(state.locale, "lastRun")}</em>` : ""}
                      </span>
                    `
                    ),
                    entry.hiddenCount > 0 ? `<span class="favorite-dock__more">+${entry.hiddenCount}</span>` : ""
                  ].join("")
                : `<span class="favorite-dock__empty-text">${t(state.locale, "noServiceText")}</span>`
            }
          </div>
          <div class="favorite-dock__actions">
            <button class="favorite-dock__move" type="button" data-move-favorite="up" data-key="${entry.item.key}" ${isFirst ? "disabled" : ""} aria-label="${t(state.locale, "moveUp")}">
              ↑
            </button>
            <button class="favorite-dock__move" type="button" data-move-favorite="down" data-key="${entry.item.key}" ${isLast ? "disabled" : ""} aria-label="${t(state.locale, "moveDown")}">
              ↓
            </button>
            <button class="favorite-dock__remove" type="button" data-remove-favorite="${entry.item.key}">
              ${t(state.locale, "remove")}
            </button>
          </div>
        </div>
      </div>
    `;
  });

  panel.innerHTML = cards.join("");
}

function resolveServiceDay(date) {
  const iso = toIsoDate(date);
  if (holidays.forcedWeekends.includes(iso)) return "weekend";
  return isWeekend(date) ? "weekend" : "weekday";
}

function getEffectiveDayForStop(date, stop, route) {
  const currentDay = resolveServiceDay(date);
  const prevDate = new Date(date);
  prevDate.setDate(date.getDate() - 1);
  const prevDay = resolveServiceDay(prevDate);
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

function getEffectiveNowMinutes(date, effectiveDay) {
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const resolved = resolveServiceDay(date);
  if (effectiveDay !== resolved && nowMinutes < CROSSOVER_MINUTES) {
    return nowMinutes + 1440;
  }
  return nowMinutes;
}

function getServiceDay(date, route) {
  if (state.serviceOverride) return state.serviceOverride;
  if (!route) return resolveServiceDay(date);
  const prevDate = new Date(date);
  prevDate.setDate(date.getDate() - 1);
  const prevDay = resolveServiceDay(prevDate);
  const currentDay = resolveServiceDay(date);
  if (prevDay === currentDay) return currentDay;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  if (nowMinutes >= CROSSOVER_MINUTES) return currentDay;
  const lastPrev = getRouteLastServiceMinute(route, prevDay);
  if (lastPrev == null) return currentDay;
  return lastPrev >= nowMinutes + 1440 ? prevDay : currentDay;
}

function getRoutesForDay(day) {
  const preferredOrder = ["olev", "campus-loop", "wolpyeong", "wolpyeong-early"];
  return mergedRoutes
    .sort((a, b) => {
      const indexA = preferredOrder.indexOf(a.id);
      const indexB = preferredOrder.indexOf(b.id);
      const weightA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
      const weightB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
      if (weightA !== weightB) return weightA - weightB;
      return a.name.localeCompare(b.name);
    });
}

function getRouteById(routes, id) {
  return routes.find((route) => route.id === id) || routes[0];
}

function buildRouteHref({ routeId, stopId, campusFrom, campusTo }) {
  const params = new URLSearchParams();
  if (routeId) params.set("route", routeId);
  if (stopId) params.set("stop", stopId);
  if (campusFrom) params.set("from", campusFrom);
  if (campusTo) params.set("to", campusTo);
  if (state.serviceOverride) params.set("day", state.serviceOverride);
  const query = params.toString();
  return query ? `./route.html?${query}` : "./route.html";
}

function buildShareHref() {
  const params = new URLSearchParams();
  if (state.routeId) params.set("route", state.routeId);
  if (state.stopId) params.set("stop", state.stopId);
  if (state.campusFrom) params.set("from", state.campusFrom);
  if (state.campusTo) params.set("to", state.campusTo);
  if (state.serviceOverride) params.set("day", state.serviceOverride);
  params.set("shared", "1");
  const query = params.toString();
  return `./route.html?${query}`;
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

function isCampusExpressTime(route, day, campusFrom, campusTo, time) {
  if (!isCampusLoop(route)) return false;
  const pairKey = `${campusFrom}->${campusTo}`;
  const express = route?.campusExpress?.[day]?.[pairKey];
  return Array.isArray(express) ? express.includes(time) : false;
}

function getActiveStop(route, day) {
  const stopsForDay = getStopsForDay(route, day);
  if (isCampusLoop(route)) {
    let active = getCampusDepartureStop(
      { ...route, stops: stopsForDay },
      state.campusFrom,
      state.campusTo
    );
    const times = active?.times?.[day] || [];
    if (!times.length) {
      active = stopsForDay.find((stop) => (stop.times?.[day] || []).length) ||
        stopsForDay[0] ||
        route.stops[0];
    }
    return active;
  }
  let active =
    stopsForDay.find((s) => s.id === state.stopId) ||
    stopsForDay.find((s) => s.default) ||
    stopsForDay[0] ||
    route.stops[0];
  const times = active?.times?.[day] || [];
  if (!times.length) {
    active = stopsForDay.find((stop) => (stop.times?.[day] || []).length) ||
      stopsForDay[0] ||
      route.stops[0];
  }
  return active;
}

function renderHeader(route) {
  const title = document.querySelector("[data-route-title]");
  const subtitle = document.querySelector("[data-route-subtitle]");
  const badge = document.querySelector("[data-route-badge]");
  const weekday = document.querySelector("[data-weekday]");
  const shareNotice = document.querySelector("#shareNotice");
  if (title) title.textContent = localizeRoute(route);
  if (subtitle) {
    subtitle.textContent = isCampusLoop(route)
      ? `${getCampusLabel(state.campusFrom)} → ${getCampusLabel(state.campusTo)}`
      : route.subtitle || "";
  }
  if (shareNotice) {
    shareNotice.textContent = state.sharedFromLink ? t(state.locale, "sharedFromLink") : "";
    shareNotice.style.display = shareNotice.textContent ? "" : "none";
  }
  if (badge) {
    const hasWeekend = route.stops.some((stop) => (stop.times?.weekend || []).length);
    badge.textContent = hasWeekend
      ? t(state.locale, "opDaily")
      : t(state.locale, "opWeekdayOnly");
    badge.classList.toggle("is-daily", hasWeekend);
    badge.classList.toggle("is-weekday", !hasWeekend);
  }
  if (weekday) {
    const dayLabel = resolveServiceDay(state.now) === "weekday"
      ? t(state.locale, "dayWeekday")
      : t(state.locale, "dayHoliday");
    const dayText = state.locale === LOCALES.EN
      ? state.now.toLocaleDateString("en-US", { weekday: "long" })
      : formatKoreanWeekday(state.now);
    weekday.textContent = `${dayText} (${dayLabel})`;
  }
}

function renderClock() {
  const clock = document.querySelector("[data-clock]");
  const date = document.querySelector("[data-date]");
  if (!clock || !date) return;
  clock.textContent = formatClockWithSeconds(state.now);
  const rawDate = formatKoreanDate(state.now);
  date.textContent = state.locale === LOCALES.EN
    ? state.now.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    : rawDate.replace(/^\d{4}년\s*/, "");
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
  if (!document.body.classList.contains("theme-night")) return;
  const cards = document.querySelectorAll(
    ".hero-card, .next-card, .notice-card, .route-card, .time-table"
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

  const pageKey = location.pathname.replace(/\W+/g, "") || "route";
  cards.forEach((card, index) => {
    const type = getCardType(card);
    const key = `${pageKey}:${type}:${index}`;
    if (!glowMap[key]) {
      glowMap[key] = buildCardGlowLayers();
    }
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

function renderSelectors(routes, route) {
  const routeSelect = document.querySelector("#routeSelect");
  const stopSelect = document.querySelector("#stopSelect");
  const stopLabel = document.querySelector("#stopSelectLabel");
  const stopRow = document.querySelector("#stopSelectRow");
  const routeSearchInput = document.querySelector("#routeSearch");
  const stopSearchInput = document.querySelector("#stopSearch");
  const campusSelector = document.querySelector("#campusSelector");
  if (!routeSelect || !stopSelect) return;

  routeSelect.innerHTML = routes
    .map((r) => {
      const routeName = localizeRoute(r);
      const subtitle = state.locale === LOCALES.EN ? r.subtitleEn || r.subtitle : r.subtitle;
      return `<option value="${r.id}">${routeName}${subtitle ? ` ${subtitle}` : ""}</option>`;
    })
    .join("");
  routeSelect.value = route.id;

  const hideStops = isCampusLoop(route);
  routeSelect.disabled = false;
  routeSelect.classList.remove("route-select--static");
  if (!hideStops) {
    const stopsForDay = getStopsForDay(route, state.serviceDay);
    stopSelect.innerHTML = stopsForDay
      .map((s) => `<option value="${s.id}">${localizeStop(s)}</option>`)
      .join("");
  } else {
    stopSelect.innerHTML = "";
  }

  if (!hideStops) {
    const stopsForDay = getStopsForDay(route, state.serviceDay);
    const defaultStop = stopsForDay.find((s) => s.default) || stopsForDay[0];
    state.stopId = stopsForDay.some((s) => s.id === state.stopId) ? state.stopId : defaultStop?.id;
    stopSelect.value = state.stopId;
    stopSelect.disabled = stopsForDay.length <= 1;
  } else {
    stopSelect.disabled = true;
  }
  stopSelect.classList.toggle("is-hidden", hideStops);
  stopSelect.style.display = hideStops ? "none" : "inline-flex";
  stopSelect.hidden = hideStops;
  stopSelect.setAttribute("aria-hidden", hideStops ? "true" : "false");
  stopSelect.tabIndex = hideStops ? -1 : 0;
  if (stopLabel) {
    stopLabel.classList.toggle("is-hidden", hideStops);
    stopLabel.hidden = hideStops;
    stopLabel.style.display = hideStops ? "none" : "inline-flex";
  }
  if (stopRow) {
    stopRow.classList.toggle("is-hidden", hideStops);
    stopRow.hidden = hideStops;
    stopRow.style.display = hideStops ? "none" : "flex";
  }
  if (campusSelector) {
    campusSelector.style.display = hideStops ? "flex" : "none";
  }

  syncDropdown(routeSelect);
  syncDropdown(stopSelect);

  routeSelect.onchange = (event) => {
    state.routeId = event.target.value;
    state.stopId = "";
    render();
  };

  stopSelect.onchange = (event) => {
    state.stopId = event.target.value;
    render();
  };

  if (routeSearchInput) {
    if (!routeSearchInput.dataset.bound) {
      routeSearchInput.dataset.bound = "true";
      routeSearchInput.addEventListener("input", () => {
        state.routeSearch = routeSearchInput.value;
        syncDropdown(routeSelect);
      });
    }
    if (routeSearchInput.value !== state.routeSearch) {
      routeSearchInput.value = state.routeSearch;
    }
  }

  if (stopSearchInput) {
    if (!stopSearchInput.dataset.bound) {
      stopSearchInput.dataset.bound = "true";
      stopSearchInput.addEventListener("input", () => {
        state.stopSearch = stopSearchInput.value;
        syncDropdown(stopSelect);
      });
    }
    if (stopSearchInput.value !== state.stopSearch) {
      stopSearchInput.value = state.stopSearch;
    }
  }
}

function renderCampusSelector(route) {
  const container = document.querySelector("#campusSelector");
  if (!container || !isCampusLoop(route)) return;

  const fromContainer = container.querySelector("[data-campus-role='from']");
  const toContainer = container.querySelector("[data-campus-role='to']");
  const swapButton = container.querySelector("#campusSwap");

  const ensureDifferentCampus = (fromId, toId) => {
    if (fromId !== toId) return { fromId, toId };
    const fallback = CAMPUS_OPTIONS.find((option) => option.id !== fromId);
    return { fromId, toId: fallback ? fallback.id : toId };
  };

  const updateFrom = (fromId) => {
    const next = ensureDifferentCampus(fromId, state.campusTo);
    state.campusFrom = next.fromId;
    state.campusTo = next.toId;
    render();
  };

  const updateTo = (toId) => {
    const next = ensureDifferentCampus(state.campusFrom, toId);
    state.campusFrom = next.fromId;
    state.campusTo = next.toId;
    render();
  };

  if (fromContainer) {
    fromContainer.innerHTML = CAMPUS_OPTIONS.map(
      (option) => `
        <button class="campus-pill ${option.id === state.campusFrom ? "is-active" : ""}" data-campus-from="${option.id}">
          ${getCampusLabel(option.id)}
        </button>
      `
    ).join("");
    fromContainer.querySelectorAll("[data-campus-from]").forEach((button) => {
      button.addEventListener("click", () => updateFrom(button.dataset.campusFrom));
    });
  }

  if (toContainer) {
    toContainer.innerHTML = CAMPUS_OPTIONS.map(
      (option) => `
        <button class="campus-pill ${option.id === state.campusTo ? "is-active" : ""} ${option.id === state.campusFrom ? "is-disabled" : ""}" data-campus-to="${option.id}" ${option.id === state.campusFrom ? "disabled" : ""}>
          ${getCampusLabel(option.id)}
        </button>
      `
    ).join("");
    toContainer.querySelectorAll("[data-campus-to]").forEach((button) => {
      button.addEventListener("click", () => updateTo(button.dataset.campusTo));
    });
  }

  if (swapButton) {
    swapButton.onclick = () => {
      const nextFrom = state.campusTo;
      const nextTo = state.campusFrom;
      state.campusFrom = nextFrom;
      state.campusTo = nextTo;
      render();
    };
  }
}

function renderStopPills(route) {
  const container = document.querySelector("#stopPills");
  const toggle = document.querySelector("#stopPillsToggle");
  if (!container) return;

  const section = container.closest("section");
  if (isCampusLoop(route)) {
    if (section) section.style.display = "none";
    return;
  }
  if (route.stops.length <= 1) {
    if (section) section.style.display = "none";
    return;
  }
  if (section) section.style.display = "block";

  const stops = getStopsForDay(route, state.serviceDay);
  container.innerHTML = stops
    .map(
      (stop) => `
      <button class="stop-pill ${stop.id === state.stopId ? "is-active" : ""}" data-stop="${stop.id}">
        ${getStopShortName(route.id, localizeStop(stop))}
      </button>
    `
    )
    .join("");

  const updateToggle = () => {
    if (!toggle) return;
    const hasOverflow = container.scrollHeight > container.clientHeight + 4;
    toggle.style.display = hasOverflow || state.stopPillsExpanded ? "inline-flex" : "none";
    toggle.innerHTML = "";
    toggle.classList.toggle("is-open", state.stopPillsExpanded);
  };

  container.classList.toggle("is-collapsed", !state.stopPillsExpanded);

  container.querySelectorAll("[data-stop]").forEach((button) => {
    button.addEventListener("click", () => {
      state.stopId = button.dataset.stop;
      render();
    });
  });

  if (toggle) {
    toggle.onclick = () => {
      state.stopPillsExpanded = !state.stopPillsExpanded;
      container.classList.toggle("is-collapsed", !state.stopPillsExpanded);
      updateToggle();
    };
  }

  requestAnimationFrame(updateToggle);
}

function renderNext(route, stop) {
  const container = document.querySelector("#nextPanel");
  if (!container) return;
  if (state.serviceOverride) {
    container.style.display = "";
    const isCampus = isCampusLoop(route);
    const subtitle = isCampus
      ? `${getCampusLabel(state.campusFrom)} → ${getCampusLabel(state.campusTo)}`
      : `${localizeStop(stop)} ${t(state.locale, "stopBase")}`;
    container.innerHTML = `
      <div class="next-header">
        <div>
          <h3>${localizeRoute(route)}</h3>
          <p>${subtitle}</p>
        </div>
        <span class="next-badge">${t(state.locale, "upcoming")}</span>
      </div>
      <div class="next-list">
        <div class="next-empty-inline">${t(state.locale, "upcomingTodayOnly")}</div>
      </div>
    `;
    return;
  }
  const effectiveNow = getEffectiveNowMinutes(state.now, state.serviceDay);
  const times = filterCampusLoopTimes(
    route,
    state.serviceDay,
    stop.times?.[state.serviceDay] || [],
    state.campusFrom,
    state.campusTo
  );
  if (times.length === 0) {
    container.style.display = "none";
    return;
  }
  container.style.display = "";
  const remaining = getRemainingDeparturesUntilLast(times, effectiveNow - 2);
  const nextTimes = remaining.slice(0, 5);
  const lastTime = remaining[remaining.length - 1];
  const hiddenCount = Math.max(0, remaining.length - nextTimes.length);
  const isCampus = isCampusLoop(route);
  const subtitle = isCampus
    ? `${getCampusLabel(state.campusFrom)} → ${getCampusLabel(state.campusTo)}`
    : `${localizeStop(stop)} ${t(state.locale, "stopBase")}`;

  container.innerHTML = `
    <div class="next-header">
      <div>
        <h3>${localizeRoute(route)}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="next-badge">${t(state.locale, "upcoming")}</span>
    </div>
    <div class="next-list">
      ${[
        ...nextTimes.map((time) => `
          <div class="next-chip">
            ${time}
            ${lastTime && time === lastTime ? `<span class="last-tag">${t(state.locale, "lastRun")}</span>` : ""}
          </div>
        `)
        ,
        hiddenCount > 0 ? `<div class="next-chip next-chip--more">+${hiddenCount}</div>` : ""
      ].join("")}
    </div>
    <p class="next-note">${t(state.locale, "realtimeNotice")}</p>
  `;
}

function renderTimetable(route, stop) {
  const table = document.querySelector("#timeTable");
  const section = document.querySelector("#timeTableSection");
  const layout = document.querySelector(".route-layout");
  if (!table) return;

  const rows = filterCampusLoopTimes(
    route,
    state.serviceDay,
    stop.times?.[state.serviceDay] || [],
    state.campusFrom,
    state.campusTo
  )
    .slice()
    .sort((a, b) => normalizeServiceMinutes(a) - normalizeServiceMinutes(b));
  const lastTime = rows[rows.length - 1];
  if (rows.length === 0) {
    table.innerHTML = "";
    if (section) section.style.display = "none";
    if (layout) layout.classList.add("is-no-timetable");
    return;
  }
  if (section) section.style.display = "";
  if (layout) layout.classList.remove("is-no-timetable");

  table.innerHTML = rows
    .map(
      (time) => `
      <div class="time-row ${lastTime && time === lastTime ? "last-run" : ""}">
        <span>${time}</span>
        <span class="time-label">${
          lastTime && time === lastTime
            ? t(state.locale, "lastRun")
            : isCampusExpressTime(route, state.serviceDay, state.campusFrom, state.campusTo, time)
              ? (state.locale === LOCALES.EN ? "Direct" : "직행")
              : t(state.locale, "scheduled")
        }</span>
      </div>
    `
    )
    .join("");
}

function renderNotes(route, stop) {
  const note = document.querySelector("#routeNote");
  if (!note) return;
  const times = filterCampusLoopTimes(
    route,
    state.serviceDay,
    stop?.times?.[state.serviceDay] || [],
    state.campusFrom,
    state.campusTo
  );
  const noServiceMessage = times.length === 0 ? t(state.locale, "noOperationForDay") : "";
  const weekendHwaamNote =
    isCampusLoop(route) &&
    state.serviceDay === "weekend" &&
    state.campusFrom === "main" &&
    state.campusTo === "hwaam"
      ? t(state.locale, "weekendHwaamNote")
      : "";
  const baseNote = state.locale === LOCALES.EN ? route.noteEn || route.note || "" : route.note || "";
  const noteText = [noServiceMessage, weekendHwaamNote, baseNote].filter(Boolean).join("\n").trim();
  note.textContent = noteText;
  note.style.display = noteText ? "" : "none";
}

function renderFavoriteButton(route, stop) {
  const button = document.querySelector("#favoriteToggleRoute");
  const help = document.querySelector("#favoriteHelp");
  if (!button) return;
  const items = readFavorites();
  const key = isCampusLoop(route)
    ? `${route.id}:${state.campusFrom}->${state.campusTo}`
    : `${route.id}:${state.stopId || stop.id}`;
  const times = filterCampusLoopTimes(
    route,
    state.serviceDay,
    stop?.times?.[state.serviceDay] || [],
    state.campusFrom,
    state.campusTo
  );
  const isNoService = times.length === 0;
  const isFavorite = items.some((item) => item.key === key);
  button.textContent = isFavorite ? t(state.locale, "removeFavorite") : t(state.locale, "addFavorite");
  const shouldDisable = isNoService && !isFavorite;
  button.disabled = false;
  button.classList.toggle("is-disabled", shouldDisable);
  button.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
  button.setAttribute("data-disabled", shouldDisable ? "true" : "false");
  if (help) {
    if (isNoService && !isFavorite) {
      help.textContent = t(state.locale, "cannotAddFavorite");
      if (state.favoriteHelpVisible) {
        help.classList.add("is-visible");
        help.setAttribute("aria-hidden", "false");
      } else {
        help.classList.remove("is-visible");
        help.setAttribute("aria-hidden", "true");
      }
    } else {
      help.textContent = "";
      help.classList.remove("is-visible");
      help.setAttribute("aria-hidden", "true");
    }
  }
}

function render() {
  state.now = new Date();
  const routes = getRoutesForDay(resolveServiceDay(state.now));
  const route = getRouteById(routes, state.routeId || routes[0]?.id);
  if (!route) return;

  state.routeId = route.id;
  state.serviceDay = getServiceDay(state.now, route);
  const stop = getActiveStop(route, state.serviceDay);

  renderHeader(route);
  renderClock();
  renderNoticeTicker();
  applyThemeByPreference(state.now);
  renderSelectors(routes, route);
  renderCampusSelector(route);
  renderNext(route, stop);
  renderTimetable(route, stop);
  renderNotes(route, stop);
  renderStopPills(route);
  renderFavoriteButton(route, stop);
  renderFavoriteDock(route);
  applyRandomCardGlow();
}

function setupServiceDayToggle() {
  const toggle = document.querySelector("#serviceDayToggle");
  if (!toggle) return;
  const updateButtons = () => {
    const resolved = resolveServiceDay(state.now);
    const active = state.serviceOverride || resolved;
    toggle.querySelectorAll("button[data-day]").forEach((button) => {
      const day = button.dataset.day;
      const isAuto = day === "auto";
      const isActive = isAuto ? !state.serviceOverride : day === active;
      button.classList.toggle("is-active", isActive);
    });
  };
  toggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-day]");
    if (!button) return;
    const day = button.dataset.day;
    const resolved = resolveServiceDay(state.now);
    if (day === "auto") {
      state.serviceOverride = null;
    } else {
      state.serviceOverride = day === resolved ? null : day;
    }
    updateButtons();
    render();
  });
  updateButtons();
}

function setupFavorites() {
  const button = document.querySelector("#favoriteToggleRoute");
  const help = document.querySelector("#favoriteHelp");
  if (!button) return;
  const showHelp = () => {
    if (!help) return;
    if (button.getAttribute("data-disabled") !== "true") return;
    if (!help.textContent.trim()) return;
    state.favoriteHelpVisible = true;
    help.classList.add("is-visible");
    help.setAttribute("aria-hidden", "false");
    help.classList.remove("is-flipped");
    requestAnimationFrame(() => {
      const rect = help.getBoundingClientRect();
      const overflowRight = rect.right > window.innerWidth - 12;
      const overflowLeft = rect.left < 12;
      if (overflowRight && !overflowLeft) {
        help.classList.add("is-flipped");
      }
    });
  };
  const hideHelp = () => {
    if (!help) return;
    if (button.getAttribute("data-disabled") !== "true") return;
    state.favoriteHelpVisible = false;
    help.classList.remove("is-visible");
    help.setAttribute("aria-hidden", "true");
  };
  button.addEventListener("mouseenter", showHelp);
  button.addEventListener("focus", showHelp);
  button.addEventListener("mouseleave", hideHelp);
  button.addEventListener("blur", hideHelp);
  button.addEventListener("click", () => {
    if (button.getAttribute("data-disabled") === "true") {
      if (state.favoriteHelpVisible) {
        hideHelp();
      } else {
        showHelp();
      }
      return;
    }
    const items = readFavorites();
    const route = mergedRoutes.find((r) => r.id === state.routeId);
    const activeStop = route ? getActiveStop(route, state.serviceDay) : null;
    const key = route && isCampusLoop(route)
      ? `${route.id}:${state.campusFrom}->${state.campusTo}`
      : `${state.routeId}:${state.stopId}`;
    const next = items.some((item) => item.key === key)
      ? items.filter((item) => item.key !== key)
      : [
          {
            key,
            routeId: state.routeId,
            stopId: activeStop?.id || state.stopId,
            campusFrom: route && isCampusLoop(route) ? state.campusFrom : undefined,
            campusTo: route && isCampusLoop(route) ? state.campusTo : undefined,
            savedAt: Date.now()
          },
          ...items
        ];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next.slice(0, 10)));
    render();
  });
}

function setupShareLink() {
  const button = document.querySelector("#shareLink");
  if (!button) return;
  const fallbackCopy = (text) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "-9999px";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.focus();
    el.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    document.body.removeChild(el);
    return copied;
  };
  button.addEventListener("click", async () => {
    const url = new URL(buildShareHref(), window.location.origin).toString();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (!fallbackCopy(url)) {
        throw new Error("clipboard unavailable");
      }
      button.textContent = t(state.locale, "copied");
      window.setTimeout(() => {
        button.textContent = t(state.locale, "shareLink");
      }, 1200);
    } catch {
      if (fallbackCopy(url)) {
        button.textContent = t(state.locale, "copied");
        window.setTimeout(() => {
          button.textContent = t(state.locale, "shareLink");
        }, 1200);
        return;
      }
      window.prompt(t(state.locale, "copyLinkPrompt"), url);
    }
  });
}

function setupThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    const isNight = document.body.classList.contains("theme-night");
    setThemePreference(isNight ? "light" : "dark");
    applyThemeByPreference(new Date());
  });
  applyThemeByPreference(new Date());
}

function applyLocale() {
  applyStaticI18n(state.locale);
  const footerUpdate = document.querySelector("#footerUpdateRoute");
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
  if (toggle) toggle.textContent = state.locale.toUpperCase();
  const dayToggle = document.querySelector("#serviceDayToggle");
  if (dayToggle) {
    const weekday = dayToggle.querySelector('button[data-day="weekday"]');
    const weekend = dayToggle.querySelector('button[data-day="weekend"]');
    const auto = dayToggle.querySelector('button[data-day="auto"]');
    if (weekday) weekday.textContent = t(state.locale, "dayWeekday");
    if (weekend) weekend.textContent = t(state.locale, "dayHoliday");
    if (auto) auto.textContent = t(state.locale, "todayMode");
  }
  const fullTitle = document.querySelector(".section-title--right");
  if (fullTitle) fullTitle.textContent = t(state.locale, "fullTimetable");
  const shareButton = document.querySelector("#shareLink");
  if (shareButton) shareButton.textContent = t(state.locale, "shareLink");
}

function setupLocaleToggle() {
  const button = document.querySelector("[data-locale-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    state.locale = setLocale(state.locale === LOCALES.KO ? LOCALES.EN : LOCALES.KO);
    applyLocale();
    render();
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
    } else {
      dock.classList.remove("is-open");
    }
    syncActive();
  });

  tab.addEventListener("click", () => {
    pinned = !pinned;
    if (pinned) {
      dock.classList.add("is-open");
    } else {
      dock.classList.remove("is-open");
    }
    syncActive();
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
        renderFavoriteDock(getRouteById(mergedRoutes, state.routeId));
        return;
      }
      const button = event.target.closest("[data-remove-favorite]");
      if (!button) return;
      const key = button.dataset.removeFavorite;
      if (!key) return;
      const items = readFavorites().filter((item) => item.key !== key);
      writeFavorites(items);
      render();
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

function setupResizeRender() {
  let resizeTimer;
  window.addEventListener("resize", () => {
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(() => {
      if (state.dropdownOpen && !isAnyDropdownFocused()) {
        closeAllDropdowns();
      }
      render();
    }, 120);
  });
}

function isUserSelectingText() {
  const selection = window.getSelection?.();
  if (!selection) return false;
  return !selection.isCollapsed && selection.toString().trim().length > 0;
}
(() => {
  const params = new URLSearchParams(window.location.search);
  const routeId = params.get("route");
  const stopId = params.get("stop");
  const campusFrom = params.get("from");
  const campusTo = params.get("to");
  const day = params.get("day");
  const shared = params.get("shared");
  if (routeId && mergedRoutes.some((route) => route.id === routeId)) {
    state.routeId = routeId;
  }
  if (stopId) {
    state.stopId = stopId;
  }
  if (day === "weekday" || day === "weekend") {
    state.serviceOverride = day;
  }
  if (shared === "1") {
    state.sharedFromLink = true;
  }
  if (campusFrom && CAMPUS_OPTIONS.some((option) => option.id === campusFrom)) {
    state.campusFrom = campusFrom;
  }
  if (campusTo && CAMPUS_OPTIONS.some((option) => option.id === campusTo)) {
    state.campusTo = campusTo;
  }
  if (state.campusFrom === state.campusTo) {
    const fallback = CAMPUS_OPTIONS.find((option) => option.id !== state.campusFrom);
    if (fallback) state.campusTo = fallback.id;
  }
})();
applyLocale();
render();
setupFavorites();
setupThemeToggle();
setupLocaleToggle();
setupFavoriteDock();
setupServiceDayToggle();
setupShareLink();
setupNavbarWrap();
setupResizeRender();
let lastMinuteKey = "";
setInterval(() => {
  state.now = new Date();
  renderClock();
  if (state.dropdownOpen) {
    const routes = getRoutesForDay(resolveServiceDay(state.now));
    const route = getRouteById(routes, state.routeId || routes[0]?.id);
    if (route) {
      state.serviceDay = getServiceDay(state.now, route);
      renderHeader(route);
    }
    return;
  }
  if (isUserSelectingText()) {
    return;
  }
  const minuteKey = `${toIsoDate(state.now)}-${state.now.getHours()}-${state.now.getMinutes()}-${state.serviceOverride || "auto"}`;
  if (minuteKey !== lastMinuteKey) {
    lastMinuteKey = minuteKey;
    render();
  }
}, 1000);



