import { readStoredArray, writeStoredArray } from "./storage.js";

const RECENT_SEARCH_KEY = "kaist-bus-recent-search";
const DEFAULT_LIMIT = 5;

export function readRecentSearches(scope = "route") {
  return readStoredArray(`${RECENT_SEARCH_KEY}:${scope}`, (item) => typeof item === "string");
}

export function writeRecentSearches(scope = "route", items = []) {
  writeStoredArray(`${RECENT_SEARCH_KEY}:${scope}`, items);
}

export function addRecentSearch(scope = "route", term, limit = DEFAULT_LIMIT) {
  const value = (term || "").trim();
  if (!value || value.length < 2) return;
  const items = readRecentSearches(scope);
  const deduped = [value, ...items.filter((item) => item.toLowerCase() !== value.toLowerCase())];
  writeRecentSearches(scope, deduped.slice(0, limit));
}
