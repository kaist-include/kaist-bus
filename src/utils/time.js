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
  const sorted = times.map(timeToMinutes).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  if (sorted.length === 1) return [minutesToTime(sorted[0])];

  const extended = [...sorted, ...sorted.map((t) => t + 1440)];
  const startIndex = extended.findIndex((t) => t >= nowMinutes);
  const sliceStart = startIndex === -1 ? 0 : startIndex;
  return extended.slice(sliceStart, sliceStart + count).map(minutesToTime);
}


