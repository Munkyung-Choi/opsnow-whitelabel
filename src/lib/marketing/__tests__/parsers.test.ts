import { describe, it, expect } from 'vitest';
import {
  parseStats, DEFAULT_STATS,
  parseSteps, DEFAULT_STEPS,
  parseFinOpsFeatures,
  parseEngines,
  parseRoles,
  parsePainPoints, DEFAULT_PAIN_POINTS,
  parseFooterContactInfo,
  parseMiniStats,
} from '../parsers';

// ─────────────────────────────────────────────────────────────────────────────
// parseStats
// ─────────────────────────────────────────────────────────────────────────────
describe('parseStats', () => {
  it('null 입력 → DEFAULT_STATS 반환', () => {
    expect(parseStats(null)).toEqual(DEFAULT_STATS);
  });

  it('배열이 아닌 입력 → DEFAULT_STATS 반환', () => {
    expect(parseStats({ value: '30%', label: 'test' })).toEqual(DEFAULT_STATS);
  });

  it('빈 배열 → DEFAULT_STATS 반환', () => {
    expect(parseStats([])).toEqual(DEFAULT_STATS);
  });

  it('표준 포맷 { value, label } → 정상 파싱', () => {
    const input = [{ value: '40%', label: '비용 절감', unit: '평균', detail: '상세설명' }];
    const result = parseStats(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ value: '40%', label: '비용 절감', unit: '평균', detail: '상세설명' });
  });

  it('unit, detail 없어도 파싱 성공', () => {
    const input = [{ value: '5분', label: '설정 완료' }];
    const result = parseStats(input);
    expect(result[0].unit).toBeUndefined();
    expect(result[0].detail).toBeUndefined();
  });

  it('레거시 포맷 { number, label } → value로 매핑', () => {
    const input = [{ number: '99%', label: '가용성' }];
    const result = parseStats(input);
    expect(result[0].value).toBe('99%');
    expect(result[0].label).toBe('가용성');
  });

  it('label 누락 항목 → 건너뜀, 유효 항목만 반환', () => {
    const input = [
      { value: '30%', label: '비용 절감' },
      { value: '5분' }, // label 없음
    ];
    const result = parseStats(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('비용 절감');
  });

  it('모든 항목이 유효하지 않으면 → DEFAULT_STATS 반환', () => {
    const input = [{ value: '30%' }, { label: '비용 절감' }];
    expect(parseStats(input)).toEqual(DEFAULT_STATS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseSteps
// ─────────────────────────────────────────────────────────────────────────────
describe('parseSteps', () => {
  it('null → DEFAULT_STEPS 반환', () => {
    expect(parseSteps(null)).toEqual(DEFAULT_STEPS);
  });

  it('빈 배열 → DEFAULT_STEPS 반환', () => {
    expect(parseSteps([])).toEqual(DEFAULT_STEPS);
  });

  it('표준 포맷 파싱', () => {
    const input = [
      { step: 1, title: '연결', description: 'API 키 입력' },
      { step: 2, title: '분석', description: '자동 분석' },
    ];
    const result = parseSteps(input);
    expect(result).toHaveLength(2);
    expect(result[0].step).toBe(1);
  });

  it('step 번호 없으면 인덱스 기반 자동 할당', () => {
    const input = [
      { title: '연결', description: 'API 키 입력' },
      { title: '분석', description: '자동 분석' },
    ];
    const result = parseSteps(input);
    expect(result[0].step).toBe(1);
    expect(result[1].step).toBe(2);
  });

  it('description 누락 항목 → 건너뜀', () => {
    const input = [
      { step: 1, title: '연결', description: 'API 키 입력' },
      { step: 2, title: '분석' }, // description 없음
    ];
    const result = parseSteps(input);
    expect(result).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseFinOpsFeatures
// ─────────────────────────────────────────────────────────────────────────────
describe('parseFinOpsFeatures', () => {
  it('null → 빈 배열', () => {
    expect(parseFinOpsFeatures(null)).toEqual([]);
  });

  it('features 키 없음 → 빈 배열', () => {
    expect(parseFinOpsFeatures({ engines: [] })).toEqual([]);
  });

  it('표준 포맷 { title, subtitle, description } → 파싱', () => {
    const input = {
      features: [
        { title: '30%', subtitle: '비용 절감', description: '상세 설명' },
      ],
    };
    const result = parseFinOpsFeatures(input);
    expect(result).toHaveLength(1);
    expect(result[0].subtitle).toBe('비용 절감');
  });

  it('subtitle 누락 항목 → 건너뜀', () => {
    const input = {
      features: [
        { title: '30%', subtitle: '비용 절감', description: '설명' },
        { title: '5분', description: '설명' }, // subtitle 없음
      ],
    };
    expect(parseFinOpsFeatures(input)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseEngines
// ─────────────────────────────────────────────────────────────────────────────
describe('parseEngines', () => {
  it('null → 빈 배열', () => {
    expect(parseEngines(null)).toEqual([]);
  });

  it('engines 키 없음 → 빈 배열', () => {
    expect(parseEngines({ features: [] })).toEqual([]);
  });

  it('표준 포맷 { name, description } → 파싱', () => {
    const input = {
      engines: [
        { name: 'Cost Analyzer', description: '비용 분석 엔진' },
        { name: 'AI Recommender', description: 'AI 권고 엔진' },
      ],
    };
    const result = parseEngines(input);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Cost Analyzer');
  });

  it('name 누락 → 건너뜀', () => {
    const input = { engines: [{ description: '설명만 있음' }] };
    expect(parseEngines(input)).toHaveLength(0);
  });

  it('WL-95: icon 필드 있으면 포함하여 반환', () => {
    const input = {
      engines: [
        { name: 'AI Engine', description: '예측 엔진', icon: 'BrainCircuit' },
      ],
    };
    expect(parseEngines(input)[0].icon).toBe('BrainCircuit');
  });

  it('WL-95: icon 필드 없으면 undefined (정적 폴백은 컴포넌트 담당)', () => {
    const input = {
      engines: [
        { name: 'Auto Engine', description: '자동화 엔진' },
      ],
    };
    expect(parseEngines(input)[0].icon).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseRoles
// ─────────────────────────────────────────────────────────────────────────────
describe('parseRoles', () => {
  it('null → 빈 배열', () => {
    expect(parseRoles(null)).toEqual([]);
  });

  it('roles 키 없음 → 빈 배열', () => {
    expect(parseRoles({ engines: [] })).toEqual([]);
  });

  it('표준 포맷 파싱 + metrics 배열 포함', () => {
    const input = {
      roles: [{
        role: 'CTO',
        title: '기술 리더를 위한',
        description: '기술 비용 최적화',
        metrics: ['30% 절감', '실시간 대시보드'],
      }],
    };
    const result = parseRoles(input);
    expect(result).toHaveLength(1);
    expect(result[0].metrics).toHaveLength(2);
  });

  it('metrics 없으면 → 빈 배열로 반환 (필수 아님)', () => {
    const input = {
      roles: [{ role: 'CFO', title: '재무 책임자용', description: '비용 가시성' }],
    };
    const result = parseRoles(input);
    expect(result[0].metrics).toEqual([]);
  });

  it('metrics 안에 non-string 값 → 필터링', () => {
    const input = {
      roles: [{
        role: 'CFO',
        title: '재무',
        description: '비용',
        metrics: ['유효한 항목', 123, null, '또 다른 항목'],
      }],
    };
    const result = parseRoles(input);
    expect(result[0].metrics).toEqual(['유효한 항목', '또 다른 항목']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parsePainPoints
// DB 키 실측: 'cards' (global_contents.meta.cards — 2026-04-15 확인)
// tag·pain 필드는 DB 미포함 → 자동 생성/undefined 처리
// ─────────────────────────────────────────────────────────────────────────────
describe('parsePainPoints', () => {
  it('null → DEFAULT_PAIN_POINTS 반환', () => {
    expect(parsePainPoints(null)).toEqual(DEFAULT_PAIN_POINTS);
  });

  it('배열이 아닌 입력 → DEFAULT_PAIN_POINTS 반환', () => {
    expect(parsePainPoints('string')).toEqual(DEFAULT_PAIN_POINTS);
  });

  it('"cards" 키 없음 → DEFAULT_PAIN_POINTS 반환', () => {
    // items·engines 등 잘못된 키로는 폴백
    expect(parsePainPoints({ items: [{ title: '제목', description: '설명' }] })).toEqual(DEFAULT_PAIN_POINTS);
  });

  it('cards 빈 배열 → DEFAULT_PAIN_POINTS 반환', () => {
    expect(parsePainPoints({ cards: [] })).toEqual(DEFAULT_PAIN_POINTS);
  });

  it('모든 항목이 유효하지 않으면 → DEFAULT_PAIN_POINTS 반환', () => {
    const input = { cards: [{ icon: 'EyeOff' }, { description: '설명만' }] };
    expect(parsePainPoints(input)).toEqual(DEFAULT_PAIN_POINTS);
  });

  it('표준 포맷 { title, description } → 정상 파싱', () => {
    const input = {
      cards: [
        { icon: 'EyeOff', title: '가시성 부족', description: '콘솔이 분산되어 있습니다.' },
        { icon: 'Clock', title: '대응 지연', description: '청구서가 늦게 옵니다.' },
      ],
    };
    const result = parsePainPoints(input);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('가시성 부족');
    expect(result[1].title).toBe('대응 지연');
  });

  it('icon 없으면 → HelpCircle 기본값 사용', () => {
    const input = { cards: [{ title: '제목', description: '설명' }] };
    expect(parsePainPoints(input)[0].icon).toBe('HelpCircle');
  });

  it('icon DB 값 있으면 → DB 값 사용', () => {
    const input = { cards: [{ icon: 'Puzzle', title: '제목', description: '설명' }] };
    expect(parsePainPoints(input)[0].icon).toBe('Puzzle');
  });

  it('tag DB 없음 → 인덱스 기반 자동 생성 ("PROBLEM 01", "PROBLEM 02"...)', () => {
    const input = {
      cards: [
        { title: '첫 번째', description: '설명1' },
        { title: '두 번째', description: '설명2' },
        { title: '세 번째', description: '설명3' },
      ],
    };
    const result = parsePainPoints(input);
    expect(result[0].tag).toBe('PROBLEM 01');
    expect(result[1].tag).toBe('PROBLEM 02');
    expect(result[2].tag).toBe('PROBLEM 03');
  });

  it('tag DB 값 있으면 → DB 값 우선 사용', () => {
    const input = { cards: [{ tag: 'CUSTOM TAG', title: '제목', description: '설명' }] };
    expect(parsePainPoints(input)[0].tag).toBe('CUSTOM TAG');
  });

  it('pain 없음 → undefined (조건부 렌더링용)', () => {
    const input = { cards: [{ title: '제목', description: '설명' }] };
    expect(parsePainPoints(input)[0].pain).toBeUndefined();
  });

  it('pain DB 값 있으면 → 포함하여 반환', () => {
    const input = {
      cards: [{ title: '제목', description: '설명', pain: '평균 18일 소요' }],
    };
    expect(parsePainPoints(input)[0].pain).toBe('평균 18일 소요');
  });

  it('title 누락 항목 → 건너뜀', () => {
    const input = {
      cards: [
        { title: '정상', description: '설명' },
        { description: '제목 없음' }, // title 없음
      ],
    };
    expect(parsePainPoints(input)).toHaveLength(1);
  });

  it('description 누락 항목 → 건너뜀', () => {
    const input = {
      cards: [
        { title: '정상', description: '설명' },
        { title: '설명 없음' }, // description 없음
      ],
    };
    expect(parsePainPoints(input)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseStats / parseSteps / parsePainPoints — i18n pre-resolved inputs
// deepLocalizeJson이 body_json / meta.cards에 적용된 뒤의 상태를 시뮬레이션.
// 파서가 이미 locale 추출된 string을 받았을 때도 정상 동작하는지 검증.
// ─────────────────────────────────────────────────────────────────────────────
describe('parseStats — i18n pre-resolved', () => {
  it('label/unit/detail이 이미 locale 추출된 string → 정상 파싱', () => {
    // deepLocalizeJson이 body_json에 적용된 후: {"ko":"..","en":".."} → 단일 string
    const input = [
      { value: '30%', unit: 'avg', label: 'Monthly Cloud Cost Reduction', detail: 'Up to 47% achieved' },
      { value: '5', unit: 'min', label: 'Initial Setup Complete' },
    ];
    const result = parseStats(input);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Monthly Cloud Cost Reduction');
    expect(result[0].unit).toBe('avg');
    expect(result[1].unit).toBe('min');
  });
});

describe('parseSteps — i18n pre-resolved', () => {
  it('subtitle/description이 이미 locale 추출된 string → 정상 파싱', () => {
    const input = [{
      step: 1, title: 'Connect',
      subtitle: 'Cloud Account Connection',
      description: 'Complete integration in under 5 minutes.',
    }];
    const result = parseSteps(input);
    expect(result[0].subtitle).toBe('Cloud Account Connection');
    expect(result[0].description).toBe('Complete integration in under 5 minutes.');
  });

  it('details 배열 항목이 이미 locale 추출된 string → 정상 파싱', () => {
    const input = [{
      step: 1, title: 'Connect', description: 'desc',
      details: ['Read-only IAM role', 'SOC2 Type II certified', 'No data egress outside VPC'],
    }];
    const result = parseSteps(input);
    expect(result[0].details).toEqual([
      'Read-only IAM role',
      'SOC2 Type II certified',
      'No data egress outside VPC',
    ]);
  });
});

describe('parsePainPoints — i18n pre-resolved', () => {
  it('title/description/tag/pain이 이미 locale 추출된 string → 정상 파싱', () => {
    // deepLocalizeJson이 global_contents.meta에 적용된 후의 상태
    const input = {
      cards: [{
        icon: 'EyeOff',
        tag: 'PROBLEM 01',
        title: 'Lack of Visibility',
        description: 'Costs scattered across separate consoles.',
        pain: 'Teams navigating 3+ consoles daily',
      }],
    };
    const result = parsePainPoints(input);
    expect(result[0].title).toBe('Lack of Visibility');
    expect(result[0].description).toBe('Costs scattered across separate consoles.');
    expect(result[0].tag).toBe('PROBLEM 01');
    expect(result[0].pain).toBe('Teams navigating 3+ consoles daily');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseMiniStats (WL-94)
// DB 구조: contents.body_json = [{ value, label }, ...]
// 빈 배열 반환 → 호출부(HeroSection)가 dictionary heroStats로 폴백
// ─────────────────────────────────────────────────────────────────────────────
describe('parseMiniStats', () => {
  it('null → 빈 배열 반환 (호출부가 dictionary 폴백)', () => {
    expect(parseMiniStats(null)).toEqual([]);
  });

  it('배열이 아닌 객체 → 빈 배열 반환', () => {
    expect(parseMiniStats({ value: '30%', label: '비용 절감' })).toEqual([]);
  });

  it('빈 배열 → 빈 배열 반환', () => {
    expect(parseMiniStats([])).toEqual([]);
  });

  it('표준 포맷 { value, label } → 정상 파싱', () => {
    const input = [
      { value: '최대 40%', label: '월 청구서 자동 절감' },
      { value: '5분', label: '초기 연동 완료' },
      { value: '무료', label: '분석 상담 제공' },
    ];
    const result = parseMiniStats(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ value: '최대 40%', label: '월 청구서 자동 절감' });
    expect(result[2]).toEqual({ value: '무료', label: '분석 상담 제공' });
  });

  it('value 누락 항목 → 건너뜀, 유효 항목만 반환', () => {
    const input = [
      { value: '30%', label: '비용 절감' },
      { label: 'value 없음' }, // value 없음
    ];
    const result = parseMiniStats(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('비용 절감');
  });

  it('label 누락 항목 → 건너뜀', () => {
    const input = [
      { value: '30%', label: '정상' },
      { value: '5분' }, // label 없음
    ];
    expect(parseMiniStats(input)).toHaveLength(1);
  });

  it('모든 항목이 유효하지 않으면 → 빈 배열 (폴백 없음)', () => {
    const input = [{ value: 123 }, { label: true }]; // 숫자/불리언은 무효
    expect(parseMiniStats(input)).toEqual([]);
  });

  it('null/배열 중첩 항목 → 건너뜀', () => {
    const input = [
      null,
      [{ value: '10%', label: '배열 항목' }], // 배열은 건너뜀
      { value: '20%', label: '정상 항목' },
    ];
    const result = parseMiniStats(input);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('20%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseFooterContactInfo
// DB 키: contents.contact_info (JSONB)
// ─────────────────────────────────────────────────────────────────────────────
describe('parseFooterContactInfo', () => {
  it('null → 빈 객체 반환', () => {
    expect(parseFooterContactInfo(null)).toEqual({});
  });

  it('배열 입력 → 빈 객체 반환', () => {
    expect(parseFooterContactInfo([])).toEqual({});
  });

  it('비객체 입력(string) → 빈 객체 반환', () => {
    expect(parseFooterContactInfo('invalid')).toEqual({});
  });

  it('정상 포맷 { email, phone, address } → 그대로 반환', () => {
    const input = {
      email: 'hello@opsnow.com',
      phone: '02-1234-5678',
      address: '서울시 강남구',
    };
    expect(parseFooterContactInfo(input)).toEqual(input);
  });

  it('일부 필드만 있어도 파싱 성공', () => {
    const input = { email: 'only@email.com' };
    const result = parseFooterContactInfo(input);
    expect(result.email).toBe('only@email.com');
    expect(result.phone).toBeUndefined();
    expect(result.address).toBeUndefined();
  });

  it('필드 값이 문자열 아님 → undefined 처리', () => {
    const input = { email: 123, phone: null, address: true };
    const result = parseFooterContactInfo(input);
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.address).toBeUndefined();
  });

  it('알 수 없는 필드는 무시됨', () => {
    const input = { email: 'test@test.com', unknown_field: '무시' };
    const result = parseFooterContactInfo(input);
    expect(result).not.toHaveProperty('unknown_field');
  });

  // ── WL-81: corporate_info 파싱 ──────────────────────────────────────────────
  it('corporate_info — companyName/representative/registrationNumber 매핑', () => {
    const input = {
      corporate_info: {
        company_name: '(주)파트너',
        representative: '홍길동',
        registration_number: '000-00-00000',
      },
    };
    const result = parseFooterContactInfo(input);
    expect(result.corporate).toEqual({
      companyName: '(주)파트너',
      representative: '홍길동',
      registrationNumber: '000-00-00000',
    });
  });

  it('corporate_info — company_name 없으면 corporate undefined', () => {
    const input = {
      corporate_info: { representative: '홍길동' }, // company_name 누락
    };
    expect(parseFooterContactInfo(input).corporate).toBeUndefined();
  });

  it('corporate_info 키 자체가 없으면 corporate undefined', () => {
    expect(parseFooterContactInfo({ email: 'a@b.com' }).corporate).toBeUndefined();
  });

  // ── WL-81: social_links 파싱 ────────────────────────────────────────────────
  it('social_links — 정상 파싱 + url 빈 문자열/null 항목 제거', () => {
    const input = {
      social_links: [
        { platform: 'linkedin', url: 'https://linkedin.com/company/test' },
        { platform: 'youtube', url: '' },          // 빈 url → 제거
        { platform: 'facebook', url: null },        // null url → 제거
        { platform: 'instagram', url: 'https://instagram.com/test' },
      ],
    };
    const result = parseFooterContactInfo(input);
    expect(result.socials).toHaveLength(2);
    expect(result.socials?.[0].platform).toBe('linkedin');
    expect(result.socials?.[1].platform).toBe('instagram');
  });

  it('social_links가 배열이 아니면 socials undefined', () => {
    const input = { social_links: { platform: 'linkedin', url: 'https://...' } };
    expect(parseFooterContactInfo(input).socials).toBeUndefined();
  });

  it('전체 필드 통합 파싱 — email/phone/address + corporate + socials', () => {
    const input = {
      email: 'hello@partner.com',
      phone: '02-1234-5678',
      address: '서울시 강남구',
      corporate_info: {
        company_name: '(주)파트너',
        representative: '홍길동',
        registration_number: '000-00-00000',
      },
      social_links: [
        { platform: 'linkedin', url: 'https://linkedin.com/company/test' },
      ],
    };
    const result = parseFooterContactInfo(input);
    expect(result.email).toBe('hello@partner.com');
    expect(result.address).toBe('서울시 강남구');
    expect(result.corporate?.companyName).toBe('(주)파트너');
    expect(result.socials).toHaveLength(1);
  });
});
