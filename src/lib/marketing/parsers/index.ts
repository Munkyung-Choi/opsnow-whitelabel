/**
 * src/lib/marketing/parsers/index.ts
 *
 * 마케팅 섹션 JSONB 데이터 파서 모음 — WL-160 섹션별 분리 (로직 동일).
 * 모든 파서는 순수 함수(Pure Function) — 부수효과 없음, 테스트 용이.
 *
 * 공통 규칙:
 *   - 입력 null / 타입 불일치 → 안전한 기본값(빈 배열 또는 DEFAULT_*) 반환
 *   - 개별 항목 형식 불일치 → 해당 항목만 건너뜀 (flatMap + return [])
 *   - 절대 throw하지 않음 — 파셜 데이터에서도 화면이 렌더되어야 함
 *
 * DB 키 실측값 (2026-04-15 확인):
 *   pain_points    → meta.cards    (WL-74 완료 후 DB 시딩 필요)
 *   finops         → meta.features
 *   core_engines   → meta.engines
 *   role_based     → meta.roles
 *   features       → meta.items   (cards 아님 — 오늘 실측)
 */

export * from './stats';
export * from './steps';
export * from './finops';
export * from './engines';
export * from './roles';
export * from './pain-points';
export * from './mini-stats';
export * from './footer';
