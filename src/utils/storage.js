export function readStoredArray(key, validate = () => true) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter(validate) : [];
  } catch {
    return [];
  }
}

export function writeStoredArray(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Timetables must still work when browser storage is unavailable/full.
  }
}

export function readGlowMap(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, layers]) =>
      Array.isArray(layers) && layers.length >= 3 && layers.every((layer) => typeof layer === "string")
    ));
  } catch {
    return {};
  }
}

export function isFavorite(value) {
  return value && typeof value === "object" &&
    [value.key, value.routeId, value.stopId].every((id) =>
      typeof id === "string" && /^[\w:>\-]+$/.test(id)
    ) && [value.campusFrom, value.campusTo].every((id) =>
      id == null || ["main", "munji", "hwaam"].includes(id)
    );
}
