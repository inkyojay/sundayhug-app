/**
 * 수면 예보 로직 (Rule-based v1)
 * 
 * 아기 정보 + 오늘 컨디션 + 날씨 데이터를 기반으로
 * 수면 점수와 행동 가이드를 생성합니다.
 * 
 * 추후 로그 데이터가 쌓이면 ML 모델로 교체/보완 가능하도록 설계
 */

import type { BabyProfile, TodayStatus, WeatherData, SleepForecast } from "./types";
import { WONDER_WEEKS } from "./types";

/**
 * 출생일로부터 주차 계산
 */
export function calculateWeeksOld(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  const diffTime = today.getTime() - birth.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.max(0, diffWeeks);
}

/**
 * 출생일로부터 개월 수 계산
 */
export function calculateMonthsOld(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  const months = (today.getFullYear() - birth.getFullYear()) * 12 
    + (today.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

/**
 * 원더윅스 시기인지 확인
 */
export function isWonderWeekPeriod(weeksOld: number): boolean {
  return WONDER_WEEKS.some((w) => Math.abs(w - weeksOld) <= 1);
}

/**
 * 수면 예보 계산 메인 함수
 */
export function calcSleepForecast(
  baby: BabyProfile,
  today: TodayStatus,
  weather: WeatherData
): SleepForecast {
  const weeksOld = calculateWeeksOld(baby.birthDate);
  let score = 70; // 기본 점수

  const reasons: string[] = [];
  const actions: string[] = [];

  // ============================================
  // 1) 날씨 영향
  // ============================================
  if (weather.pressure < 1005) {
    score -= 10;
    reasons.push("오늘은 기압이 낮아 평소보다 잠을 설칠 가능성이 있어요.");
  }
  
  if (weather.humidity > 75) {
    score -= 5;
    reasons.push("습도가 높아 답답함을 느낄 수 있는 환경이에요.");
  } else if (weather.humidity < 30) {
    score -= 3;
    reasons.push("습도가 낮아 건조함을 느낄 수 있어요.");
  }

  if (weather.temp > 28) {
    score -= 8;
    reasons.push("오늘 기온이 높아 더위에 불편할 수 있어요.");
  } else if (weather.temp < 15) {
    score -= 5;
    reasons.push("오늘 기온이 낮아 쌀쌀함을 느낄 수 있어요.");
  }

  // ============================================
  // 2) 월령/원더윅스 영향
  // ============================================
  if (isWonderWeekPeriod(weeksOld)) {
    score -= 10;
    reasons.push(`현재 ${weeksOld}주차로, 원더윅스 시기에 해당해요. 발달 과정에서 예민해질 수 있어요.`);
  }

  // 신생아 시기 (0-3개월)
  const monthsOld = calculateMonthsOld(baby.birthDate);
  if (monthsOld < 3) {
    score -= 5;
    reasons.push("아직 수면 패턴이 자리 잡히는 시기예요.");
  }

  // ============================================
  // 3) 오늘 컨디션 영향
  // ============================================
  if (today.napLevel === "high") {
    score -= 10;
    reasons.push("낮잠 시간이 많아 밤잠에 영향을 줄 수 있어요.");
  } else if (today.napLevel === "low") {
    score += 5;
    // 낮잠이 적으면 오히려 잘 잘 수 있음 (단, 너무 피곤하면 역효과)
  }

  if (today.mood === "bad") {
    score -= 10;
    reasons.push("오늘 컨디션이 예민한 편으로 입력되었어요.");
  } else if (today.mood === "good") {
    score += 5;
  }

  if (today.outing) {
    // 외출은 양날의 검: 적당한 자극은 좋지만, 과한 자극은 오히려 방해
    if (today.mood === "bad") {
      score -= 5;
      reasons.push("외출로 인한 자극이 예민한 상태에서 수면에 영향을 줄 수 있어요.");
    } else {
      score += 3;
      reasons.push("적당한 외출 활동이 수면에 긍정적인 영향을 줄 수 있어요.");
    }
  }

  // 특이사항 처리
  switch (today.specialIssue) {
    case "vaccine":
      score -= 15;
      reasons.push("오늘 예방접종이 있어 수면에 변수가 될 수 있어요.");
      break;
    case "cold":
      score -= 15;
      reasons.push("감기 기운이 있어 불편함을 느낄 수 있어요.");
      break;
    case "teething":
      score -= 12;
      reasons.push("이앓이 중이라 잇몸 불편함으로 잠들기 어려울 수 있어요.");
      break;
  }

  // ============================================
  // 4) 아기 기본 수면 성향
  // ============================================
  if (baby.sleepSensitivity === "high") {
    score -= 5;
  } else if (baby.sleepSensitivity === "low") {
    score += 5;
  }

  // ============================================
  // 5) 점수 범위 보정 (0~100)
  // ============================================
  score = Math.max(0, Math.min(100, score));

  // 레벨 결정
  let level: "good" | "caution" | "hard";
  if (score >= 70) {
    level = "good";
  } else if (score >= 40) {
    level = "caution";
  } else {
    level = "hard";
  }

  // ============================================
  // 6) 행동 가이드 생성 (레벨 기준)
  // ============================================
  if (level === "good") {
    actions.push("평소 루틴을 유지해 주면 비교적 편안한 밤이 될 가능성이 높아요.");
    actions.push("취침 전 30분은 조용하고 어두운 환경을 유지해 주세요.");
    if (weather.humidity < 50) {
      actions.push("가습기를 틀어 적정 습도(50~60%)를 유지하면 더 좋아요.");
    }
  } else if (level === "caution") {
    actions.push("오늘은 평소보다 잠들기까지 시간이 더 걸릴 수 있어요.");
    actions.push("방 온도를 22~24도로 맞추고, 조명은 최대한 낮춰 주세요.");
    
    if (weather.humidity > 70) {
      actions.push("습도가 높으니 제습기나 에어컨을 활용해 주세요.");
    } else if (weather.humidity < 40) {
      actions.push("가습기를 틀어 적정 습도를 유지해 주세요.");
    }
    
    if (today.napLevel === "high") {
      actions.push("내일은 낮잠 시간을 조금 줄여보는 것도 방법이에요.");
    }
    
    actions.push("두꺼운 이불 대신 통기성 좋은 침구를 사용해 주세요.");
  } else {
    actions.push("오늘은 잠자리 적응이 어려운 밤이 될 수 있어요.");
    actions.push("취침 전 자극적인 놀이는 피하고, 충분한 안정을 먼저 주세요.");
    actions.push("밤에 자주 깰 수 있으니 부모님도 함께 휴식 시간을 확보해 주세요.");
    
    if (today.specialIssue === "vaccine") {
      actions.push("접종 부위를 시원하게 해주고, 열이 나면 해열제를 준비해 주세요.");
    } else if (today.specialIssue === "cold") {
      actions.push("코가 막히면 식염수 스프레이나 콧물 흡입기를 사용해 주세요.");
    } else if (today.specialIssue === "teething") {
      actions.push("치발기나 이앓이 젤을 사용해 불편함을 완화해 주세요.");
    }
    
    actions.push("백색소음기를 활용하면 자주 깨는 것을 줄일 수 있어요.");
  }

  // 기본 사유가 없으면 기본 메시지 추가
  if (reasons.length === 0) {
    if (level === "good") {
      reasons.push("특별한 변수 없이 평온한 조건이에요.");
    } else {
      reasons.push("전반적인 컨디션과 환경을 종합적으로 고려했어요.");
    }
  }

  return {
    date: today.date,
    score,
    level,
    reasons,
    actions,
    weather,
  };
}

