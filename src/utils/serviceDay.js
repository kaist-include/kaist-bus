import holidays from "../data/holidays.json";
import { toIsoDate, isWeekend } from "./time.js";

// 매년 같은 양력 날짜로 반복되는 고정 공휴일. 여기 넣어두면 연도와 무관하게 자동으로 휴일 시간표가 적용된다.
// 날짜가 매년 바뀌는 휴일(설·추석·부처님오신날·선거일·대체/임시공휴일)은
// data/holidays.json 의 forcedWeekends 로 그해에만 등록한다.
export const FIXED_HOLIDAYS = {
  "01-01": { ko: "신정", en: "New Year's Day" },
  "03-01": { ko: "삼일절", en: "Independence Movement Day" },
  "05-05": { ko: "어린이날", en: "Children's Day" },
  "06-06": { ko: "현충일", en: "Memorial Day" },
  "07-17": { ko: "제헌절", en: "Constitution Day" },
  "08-15": { ko: "광복절", en: "Liberation Day" },
  "10-03": { ko: "개천절", en: "National Foundation Day" },
  "10-09": { ko: "한글날", en: "Hangeul Day" },
  "12-25": { ko: "성탄절", en: "Christmas Day" }
};

// 운행 구분과 라벨을 함께 반환한다.
// 우선순위: forcedWeekends(수동) > 고정 공휴일(자동) > 토·일 > 평일
export function resolveServiceDay(date) {
  const iso = toIsoDate(date);
  if (holidays.forcedWeekends.includes(iso)) {
    return {
      day: "weekend",
      labelKo: holidays.labels?.[iso] || "휴일",
      labelEn: holidays.labelsEn?.[iso] || "Holiday"
    };
  }
  const fixed = FIXED_HOLIDAYS[iso.slice(5)];
  if (fixed) {
    return { day: "weekend", labelKo: fixed.ko, labelEn: fixed.en };
  }
  return isWeekend(date)
    ? { day: "weekend", labelKo: "주말", labelEn: "Weekend" }
    : { day: "weekday", labelKo: "평일", labelEn: "Weekday" };
}

// 라벨 없이 운행 구분 문자열("weekday" | "weekend")만 필요할 때 사용.
export function getResolvedDay(date) {
  return resolveServiceDay(date).day;
}
