import { minutesToTime } from "./time.js";

export const CROSSOVER_MINUTES = 4 * 60;

export function normalizeServiceMinutes(time) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(time);
  if (!match || Number(match[1]) >= 28) return NaN;
  const hour = Number(match[1]);
  return (hour < 4 ? hour + 24 : hour) * 60 + Number(match[2]);
}

export function getServiceContext(date, route, resolveDay) {
  const serviceDate = new date.constructor(date.getTime());
  const clockMinutes = date.getHours() * 60 + date.getMinutes();
  const previous = new date.constructor(date.getTime());
  previous.setDate(previous.getDate() - 1);
  const previousDay = resolveDay(previous).day;
  const previousTimes = (route?.stops || []).flatMap((stop) => stop.times?.[previousDay] || []);
  const previousLast = Math.max(-Infinity, ...previousTimes.map(normalizeServiceMinutes));
  // A service date matters even when both calendar dates are weekdays.
  const previousDate = clockMinutes < CROSSOVER_MINUTES && previousLast >= clockMinutes + 1440;
  if (previousDate) serviceDate.setDate(serviceDate.getDate() - 1);
  return {
    ...resolveDay(serviceDate),
    serviceDate,
    nowMinutes: clockMinutes + (previousDate ? 1440 : 0)
  };
}

export function getRemainingDepartures(times, nowMinutes, count = Infinity) {
  return [...new Set(times.map(normalizeServiceMinutes))]
    .filter((minute) => Number.isFinite(minute) && minute >= nowMinutes)
    .sort((a, b) => a - b)
    .slice(0, count)
    .map(minutesToTime);
}

export function selectRouteTimes(route, day, fallback, from, to, context, applyExceptions = true) {
  let times = fallback || [];
  if (route?.id === "campus-loop" && from && to) {
    // An empty/missing pair means no service, never another direction's times.
    times = route.campusPairs?.[day]?.[`${from}->${to}`] || [];
  }
  if (applyExceptions && route?.holidayMorningSuspension &&
      ["설날", "추석"].includes(context?.labelKo)) {
    times = times.filter((time) => normalizeServiceMinutes(time) >= 13 * 60 + 50);
  }
  return times.slice();
}
