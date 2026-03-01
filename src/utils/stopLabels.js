import stopAliases from "../data/stop_aliases.json";

const aliasIndex = new Map(
  stopAliases.map((entry) => [`${entry.routeId}::${entry.stopName}`, entry.shortName])
);

export function getStopShortName(routeId, stopName) {
  const aliasKey = `${routeId}::${stopName}`;
  const alias = aliasIndex.get(aliasKey);
  if (alias) {
    return alias;
  }

  const core = stopName
    .replace(/^(본교\s*출발|본교\s*도착|본교출발|본교도착|시내\s*구간|시내구간|출발|도착)\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (core.includes("강당")) {
    const tag = stopName.match(/\((E10|E15)\)/) || core.match(/\((E10|E15)\)/);
    if (tag) {
      return `강당 ${tag[0]}`;
    }
    return "강당";
  }

  if (core === "오리연못") {
    if (/본교\s*출발|본교출발/.test(stopName)) return "오리연못 출발";
    if (/본교\s*도착|본교도착/.test(stopName)) return "오리연못 도착";
  }

  return core.replace(/\s*\([^)]*\)/g, "") || stopName;
}
