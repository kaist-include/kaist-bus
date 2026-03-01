const RECENT_SEARCH_KEY = "kaist-bus-recent-search";
const DEFAULT_LIMIT = 5;

export function readRecentSearches(scope = "route") {
  try {
    const raw = localStorage.getItem(`${RECENT_SEARCH_KEY}:${scope}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeRecentSearches(scope = "route", items = []) {
  localStorage.setItem(`${RECENT_SEARCH_KEY}:${scope}`, JSON.stringify(items));
}

export function addRecentSearch(scope = "route", term, limit = DEFAULT_LIMIT) {
  const value = (term || "").trim();
  if (!value || value.length < 2) return;
  const items = readRecentSearches(scope);
  const deduped = [value, ...items.filter((item) => item.toLowerCase() !== value.toLowerCase())];
  writeRecentSearches(scope, deduped.slice(0, limit));
}
