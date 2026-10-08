export function pad2(num) {
  return String(num).padStart(2, "0");
}

export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const normalized = (mins + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function formatClock(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatClockWithSeconds(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export function formatKoreanDate(date) {
  return `${date.getFullYear()}년 ${pad2(date.getMonth() + 1)}월 ${pad2(date.getDate())}일`;
}

export function formatKoreanWeekday(date) {
  const names = ["일", "월", "화", "수", "목", "금", "토"];
  return `${names[date.getDay()]}요일`;
}

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getNextDepartures(times, nowMinutes, count = 5) {
  return times.map(timeToMinutes).map((minute) => minute < 240 ? minute + 1440 : minute).sort((a, b) => a - b)
    .filter((minute) => minute >= nowMinutes).slice(0, count).map(minutesToTime);
}

// Store a KST wall-clock on a UTC calendar so the viewer's DST cannot move
// nonexistent local times (e.g. 02:30 on a US spring-forward date).
class KoreaWallClockDate extends Date {
  getFullYear() { return this.getUTCFullYear(); }
  getMonth() { return this.getUTCMonth(); }
  getDate() { return this.getUTCDate(); }
  getDay() { return this.getUTCDay(); }
  getHours() { return this.getUTCHours(); }
  getMinutes() { return this.getUTCMinutes(); }
  getSeconds() { return this.getUTCSeconds(); }
  setDate(day) { return this.setUTCDate(day); }
  toLocaleDateString(locale, options) {
    return super.toLocaleDateString(locale, { ...options, timeZone: "UTC" });
  }
}

// For wall-clock scheduling/display only; Date.now() remains the real timestamp.
export function getKoreaNow(instant = new Date()) {
  return new KoreaWallClockDate(instant.getTime() + 9 * 60 * 60 * 1000);
}


