import { matchesQuery } from "./search.js";

export function getRouteSearchText(route) {
  return [
    route.name,
    route.nameEn || "",
    route.subtitle || "",
    route.subtitleEn || "",
    ...(route.tags || []),
    ...(route.tagsEn || [])
  ].join(" ");
}

export function getSearchCandidates(items, getText) {
  return items.map(getText);
}

export function resolveHighlightSource({ rawQuery, effectiveQuery, filtered, isComposing }) {
  const highlightQuery = (rawQuery || "").trim().toLowerCase();
  if (!highlightQuery) return effectiveQuery;
  if (!isComposing) return highlightQuery;
  const canUseHighlightQuery = filtered.some((item) => {
    const text = typeof item === "string" ? item : getRouteSearchText(item);
    return matchesQuery(text, highlightQuery);
  });
  return canUseHighlightQuery ? highlightQuery : effectiveQuery;
}
