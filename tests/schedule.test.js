import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getServiceContext, getRemainingDepartures, selectRouteTimes } from "../src/utils/schedule.js";
import { getKoreaNow, toIsoDate, getNextDepartures } from "../src/utils/time.js";
import { readStoredArray, writeStoredArray, isFavorite, readGlowMap } from "../src/utils/storage.js";

const routes = JSON.parse(readFileSync(new URL("../src/data/routes.json", import.meta.url), "utf8").replace(/^\uFEFF/, "")).routes;
const campus = routes.find((r) => r.id === "campus-loop");
const early = routes.find((r) => r.id === "wolpyeong-early");
const holidays = JSON.parse(readFileSync(new URL("../src/data/holidays.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const resolveDay = (date) => {
  const iso = toIsoDate(date);
  const labelKo = holidays.labels[iso] || (iso === "2026-10-09" ? "한글날" : "");
  return { day: labelKo || [0, 6].includes(date.getDay()) ? "weekend" : "weekday", labelKo };
};

test("weekday to weekday midnight uses the previous service date", () => {
  const context = getServiceContext(new Date(2026, 9, 8, 0, 30), campus, resolveDay);
  assert.equal(toIsoDate(context.serviceDate), "2026-10-07");
  assert.equal(context.nowMinutes, 1470);
  assert.deepEqual(getRemainingDepartures(campus.campusPairs.weekday["main->munji"], context.nowMinutes), ["01:30", "03:00"]);
});

test("holiday midnight retains weekday service; 04:00 changes service date", () => {
  const night = getServiceContext(new Date(2026, 9, 9, 0, 30), campus, resolveDay);
  assert.equal(night.day, "weekday");
  assert.deepEqual(getRemainingDepartures(campus.campusPairs[night.day]["main->munji"], night.nowMinutes), ["01:30", "03:00"]);
  const morning = getServiceContext(new Date(2026, 9, 9, 4, 0), campus, resolveDay);
  assert.equal(morning.day, "weekend");
  assert.equal(morning.nowMinutes, 240);
});

test("weekend to weekday rollover retains weekend night schedule", () => {
  const context = getServiceContext(new Date(2026, 9, 12, 0, 30), campus, resolveDay);
  assert.equal(context.day, "weekend");
  assert.deepEqual(getRemainingDepartures(campus.campusPairs.weekend["main->munji"], context.nowMinutes), ["01:00", "02:30"]);
});

test("after last bus does not wrap or invent tomorrow's service", () => {
  assert.deepEqual(getRemainingDepartures(["08:10"], 491), []);
  assert.deepEqual(getNextDepartures(["08:10"], 491), []);
  assert.deepEqual(getRemainingDepartures(["00:00", "01:30", "03:00"], 1640), []);
});

test("after the previous night's service ends, today's morning becomes available", () => {
  const context = getServiceContext(new Date(2026, 9, 8, 3, 40), campus, resolveDay);
  assert.equal(toIsoDate(context.serviceDate), "2026-10-08");
  assert.equal(context.nowMinutes, 220);
  assert.equal(getRemainingDepartures(campus.campusPairs.weekday["main->munji"], context.nowMinutes)[0], "07:50");
});

test("a daytime-only route uses today's holiday calendar at midnight", () => {
  const context = getServiceContext(new Date(2026, 9, 9, 0, 30), early, resolveDay);
  assert.equal(context.day, "weekend");
  assert.equal(context.nowMinutes, 30);
});

test("empty and invalid campus directions never fall back to another bus", () => {
  assert.deepEqual(selectRouteTimes(campus, "weekday", ["09:00"], "main", "main"), []);
  const route = { id: "campus-loop", campusPairs: { weekday: { "main->munji": [] } } };
  assert.deepEqual(selectRouteTimes(route, "weekday", ["09:00"], "main", "munji"), []);
});

test("Chuseok morning suspension applies by service date, not calendar date", () => {
  const context = getServiceContext(new Date(2026, 8, 25, 9), campus, resolveDay);
  assert.equal(selectRouteTimes(campus, "weekend", [], "munji", "hwaam", context)[0], "13:50");
  assert.equal(selectRouteTimes(campus, "weekend", [], "main", "munji", context)[0], "14:30");
  const night = getServiceContext(new Date(2026, 8, 25, 0, 30), campus, resolveDay);
  assert.equal(night.labelKo, "추석 연휴");
  assert.equal(night.day, "weekend");
  assert.equal(selectRouteTimes(campus, night.day, [], "main", "munji", night)[0], "08:30");
  // Explicit timetable browsing remains a complete generic timetable.
  assert.equal(selectRouteTimes(campus, "weekend", [], "main", "munji", context, false)[0], "08:30");
});

test("KST clock is independent of viewer timezone", () => {
  const date = getKoreaNow(new Date("2026-10-08T15:30:00Z"));
  assert.equal(toIsoDate(date), "2026-10-09");
  assert.equal(date.getHours(), 0);
  assert.equal(date.getMinutes(), 30);
  const dstDate = getKoreaNow(new Date("2026-03-07T17:30:00Z"));
  assert.equal(toIsoDate(dstDate), "2026-03-08");
  assert.equal(dstDate.getHours(), 2);
  const context = getServiceContext(dstDate, campus, resolveDay);
  assert.equal(toIsoDate(context.serviceDate), "2026-03-07");
  assert.equal(context.nowMinutes, 1590);
});

test("corrupt or unavailable browser storage cannot break timetables", () => {
  globalThis.localStorage = { getItem: () => "{}", setItem: () => { throw Error("quota"); } };
  assert.deepEqual(readStoredArray("favorites", isFavorite), []);
  assert.doesNotThrow(() => writeStoredArray("favorites", []));
  globalThis.localStorage.getItem = () => '[null,42,{"key":"campus-loop:main->munji","routeId":"campus-loop","stopId":"stop-8","campusFrom":"main","campusTo":"munji"}]';
  assert.equal(readStoredArray("favorites", isFavorite).length, 1);
  globalThis.localStorage.getItem = () => { throw Error("disabled"); };
  assert.deepEqual(readStoredArray("favorites", isFavorite), []);
});

test("invalid night-theme cache cannot crash rendering", () => {
  globalThis.sessionStorage = { getItem: () => "null" };
  assert.deepEqual(readGlowMap("glow"), {});
  globalThis.sessionStorage.getItem = () => '{"a":42,"b":null,"c":["a","b","c"]}';
  assert.deepEqual(readGlowMap("glow"), { c: ["a", "b", "c"] });
});
