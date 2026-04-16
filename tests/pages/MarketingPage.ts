import { type Page, type Locator } from '@playwright/test';

/**
 * 파트너 마케팅 메인 페이지 POM (Page Object Model)
 *
 * 섹션 ID는 각 컴포넌트의 <section id="..."> 속성과 1:1 대응.
 * section_type → DOM id 매핑표:
 *   pain_points       → #pain-points
 *   stats             → #stats
 *   how_it_works      → #how-it-works
 *   finops_automation → #finops
 *   core_engines      → #core-engines
 *   role_based_value  → #role-value
 *   faq               → #faq
 *   final_cta         → #contact  (FinalCTASection → ContactForm)
 */
export class MarketingPage {
  readonly page: Page;
  readonly partnerSubdomain: string;
  readonly locale: string;

  // 고정 섹션 (partner_sections 미제어)
  readonly heroSection: Locator;

  // partner_sections 제어 섹션 (8개)
  readonly painPointsSection: Locator;
  readonly statsSection: Locator;
  readonly howItWorksSection: Locator;
  readonly finopsSection: Locator;
  readonly coreEnginesSection: Locator;
  readonly roleValueSection: Locator;
  readonly faqSection: Locator;
  readonly contactSection: Locator; // final_cta

  // ── WL-98: 섹션 내부 세부 로케이터 ──────────────────────────────────────────────
  // HowItWorks
  /** 데스크톱 레이아웃의 스텝 카드 h3 (모바일은 display:none) */
  readonly howItWorksCards: Locator;

  // CoreEngines
  /** shadcn Card의 data-slot="card" — 3개 엔진 카드 */
  readonly coreEngineCards: Locator;

  // FinOpsAutomation
  /** 데스크톱 전용(md+) 오른쪽 화살표 */
  readonly finopsArrowRight: Locator;
  /** 모바일 전용(< md) 아래쪽 화살표 */
  readonly finopsArrowDown: Locator;

  // RoleBasedValue
  /** shadcn Tabs의 TabsList — role="tablist" */
  readonly roleTabsList: Locator;
  readonly roleTabCto: Locator;
  readonly roleTabDevops: Locator;
  readonly roleTabCfo: Locator;

  // FaqSection
  /** shadcn Accordion 루트 — data-slot="accordion" */
  readonly faqAccordion: Locator;
  /** 아코디언 개별 항목 — data-slot="accordion-item" */
  readonly faqAccordionItems: Locator;
  /** 카테고리 필터 버튼 전체 (헤더 영역의 button만 집계) */
  readonly faqCategoryButtons: Locator;
  /** "모든 FAQ 보기" 링크 (Button asChild로 Link 래핑) */
  readonly faqAllCta: Locator;

  // ── WL-101: ContactForm 세부 로케이터 ────────────────────────────────────────────
  /** 이름 input (id="customer_name", required) */
  readonly contactNameInput: Locator;
  /** 이메일 input (id="email", type="email", required) */
  readonly contactEmailInput: Locator;
  /** 회사명 input (id="company_name") */
  readonly contactCompanyInput: Locator;
  /** 월 클라우드 사용량 SelectTrigger — role="combobox" */
  readonly contactUsageSelect: Locator;
  /** 문의 내용 textarea (id="message") */
  readonly contactMessageTextarea: Locator;
  /** 제출 button (type="submit") */
  readonly contactSubmitBtn: Locator;

  // ── WL-100: HeroSection · PainPoints · StatsSection 세부 로케이터 ──────────────

  // HeroSection (WL-67)
  /** h1 타이틀 — content?.title 이 DB에 있을 때만 렌더됨 */
  readonly heroTitle: Locator;
  /** 부제목 단락 — 항상 렌더 (fallback: defaultSubtitle) */
  readonly heroSubtitle: Locator;
  /** CTA 링크 href="#contact" */
  readonly heroCta: Locator;
  /** 서비스 둘러보기 버튼의 lucide-chevron-down SVG */
  readonly heroChevron: Locator;
  /** HeroImage <img> 요소 */
  readonly heroImage: Locator;

  // PainPoints (WL-74)
  /** 문제 카드 3개 — data-slot="card" */
  readonly painPointCards: Locator;
  /** PROBLEM 01/02/03 태그 span */
  readonly painPointTags: Locator;

  // StatsSection (WL-82)
  /** 통계 카드 3개 — data-slot="card" */
  readonly statCards: Locator;
  /** 통계 수치 span (.tabular-nums) */
  readonly statValues: Locator;

  // ── WL-99: GlobalNav + LanguageSelector 로케이터 ──────────────────────────────
  /** sticky header 전체 — <header> */
  readonly navHeader: Locator;
  /** 로고 영역 링크 — aria-label "{business_name} 홈" */
  readonly navLogoLink: Locator;
  /**
   * 데스크톱 주요 메뉴 링크 — <nav aria-label="주요 메뉴"> 내 앵커 (md+ 뷰포트)
   * 모바일 뷰포트에서는 hidden(md:flex → display:none) — :visible로 필터 필요
   */
  readonly navDesktopLinks: Locator;
  /**
   * 모바일 햄버거 버튼 — aria-label="메뉴 열기" (KO) / "Open menu" (EN)
   * md+ 뷰포트에서는 md:hidden → :visible로 필터 시 0개
   */
  readonly navMobileTrigger: Locator;
  /**
   * LanguageSelector SelectTrigger — role="combobox", aria-label="언어 선택"
   * published_locales ≤ 1이면 null 반환(렌더 없음)
   */
  readonly langSelector: Locator;

  constructor(page: Page, partnerSubdomain: string, locale = 'ko') {
    this.page = page;
    this.partnerSubdomain = partnerSubdomain;
    this.locale = locale;

    this.heroSection      = page.locator('#hero');
    this.painPointsSection = page.locator('#pain-points');
    this.statsSection     = page.locator('#stats');
    this.howItWorksSection = page.locator('#how-it-works');
    this.finopsSection    = page.locator('#finops');
    this.coreEnginesSection = page.locator('#core-engines');
    this.roleValueSection = page.locator('#role-value');
    this.faqSection       = page.locator('#faq');
    this.contactSection   = page.locator('#contact');

    // ── WL-101 세부 로케이터 ───────────────────────────────────────────────────
    // ContactForm
    this.contactNameInput       = this.contactSection.locator('input#customer_name');
    this.contactEmailInput      = this.contactSection.locator('input#email');
    this.contactCompanyInput    = this.contactSection.locator('input#company_name');
    this.contactUsageSelect     = this.contactSection.getByRole('combobox');
    this.contactMessageTextarea = this.contactSection.locator('textarea#message');
    this.contactSubmitBtn       = this.contactSection.locator('button[type="submit"]');

    // ── WL-100 세부 로케이터 ───────────────────────────────────────────────────
    // HeroSection
    this.heroTitle    = this.heroSection.locator('h1, h2');
    this.heroSubtitle = this.heroSection.locator('p').first();
    this.heroCta      = this.heroSection.locator('a[href="#contact"]');
    this.heroChevron  = this.heroSection.locator('svg.lucide-chevron-down');
    this.heroImage    = this.heroSection.locator('img');

    // PainPoints
    this.painPointCards = this.painPointsSection.locator('[data-slot="card"]');
    this.painPointTags  = this.painPointsSection.locator('span').filter({ hasText: /PROBLEM/ });

    // StatsSection
    this.statCards  = this.statsSection.locator('[data-slot="card"]');
    this.statValues = this.statsSection.locator('.tabular-nums');

    // ── WL-98 세부 로케이터 ───────────────────────────────────────────────────
    // HowItWorks: 데스크톱·모바일 듀얼 레이아웃 모두 DOM에 존재하므로 :visible로 필터
    this.howItWorksCards = this.howItWorksSection.locator('h3:visible');

    // CoreEngines: 엔진 카드 3개
    this.coreEngineCards = this.coreEnginesSection.locator('[data-slot="card"]');

    // FinOps: Lucide 아이콘은 class 기반으로 식별 (lucide-arrow-right, lucide-arrow-down)
    // 반응형 클래스로 visibility 결정 → first()로 단일 요소 선택
    this.finopsArrowRight = this.finopsSection.locator('svg.lucide-arrow-right').first();
    this.finopsArrowDown  = this.finopsSection.locator('svg.lucide-arrow-down').first();

    // RoleBasedValue: Radix Tabs → role=tablist/tab, 이름으로 탭 식별
    this.roleTabsList  = this.roleValueSection.getByRole('tablist');
    this.roleTabCto    = this.roleValueSection.getByRole('tab', { name: 'CTO' });
    this.roleTabDevops = this.roleValueSection.getByRole('tab', { name: 'DevOps' });
    this.roleTabCfo    = this.roleValueSection.getByRole('tab', { name: 'CFO' });

    // FaqSection
    this.faqAccordion = this.faqSection.locator('[data-slot="accordion"]');
    this.faqAccordionItems = this.faqSection.locator('[data-slot="accordion-item"]');
    // 헤더 영역(lg:col-span-1) 내부 카테고리 필터 버튼만 — 아코디언 트리거 버튼 제외
    this.faqCategoryButtons = this.faqSection.locator(
      'div.lg\\:col-span-1 > div.flex.flex-wrap > button',
    );
    this.faqAllCta = this.faqSection.getByRole('link', { name: /모든 FAQ 보기/ });

    // ── WL-99: GlobalNav + LanguageSelector ─────────────────────────────────────
    this.navHeader = page.locator('header');
    // 로고 링크: aria-label은 "{business_name} 홈" — business_name은 파트너별 상이하므로 /홈$/ 정규식 사용
    this.navLogoLink = this.navHeader.getByRole('link', { name: /홈$/ });
    // 데스크톱 메뉴: <nav aria-label="주요 메뉴"> 내 앵커
    this.navDesktopLinks = this.navHeader.locator('nav[aria-label="주요 메뉴"] a');
    // 햄버거: KO="메뉴 열기", EN="Open menu" — 언어 무관 aria-label 포함 패턴으로 매칭
    this.navMobileTrigger = this.navHeader.getByRole('button', { name: /메뉴 열기|Open menu/i });
    // LanguageSelector: SelectTrigger는 role="combobox", aria-label="언어 선택" (한국어 고정)
    this.langSelector = this.navHeader.getByRole('combobox', { name: '언어 선택' });
  }

  get url(): string {
    // 로케일은 middleware(proxy.ts)가 detectLocale()로 자동 주입한다.
    // URL에 locale 세그먼트를 포함하면 /{partnerId}/{locale}/ko 이중 경로가 생겨 404가 된다.
    return `http://${this.partnerSubdomain}.localhost:3000/`;
  }

  async goto(): Promise<void> {
    // 'load': 모든 리소스 로드 완료 대기 — Next.js RSC 스트리밍 청크 포함
    await this.page.goto(this.url, { waitUntil: 'load' });
  }

  /** partner_sections로 제어되는 8개 섹션 로케이터 배열 */
  get partnerControlledSections(): Locator[] {
    return [
      this.painPointsSection,
      this.statsSection,
      this.howItWorksSection,
      this.finopsSection,
      this.coreEnginesSection,
      this.roleValueSection,
      this.faqSection,
      this.contactSection,
    ];
  }
}

/** 법적 고지 페이지 POM */
export class LegalPage {
  readonly page: Page;
  readonly partnerSubdomain: string;
  readonly locale: string;
  readonly pageType: 'terms' | 'privacy' | 'cookie-policy';

  constructor(
    page: Page,
    partnerSubdomain: string,
    pageType: 'terms' | 'privacy' | 'cookie-policy',
    locale = 'ko',
  ) {
    this.page = page;
    this.partnerSubdomain = partnerSubdomain;
    this.locale = locale;
    this.pageType = pageType;
  }

  get url(): string {
    // locale 세그먼트 없이 pageType만 포함 — middleware가 /{partnerId}/{locale}/{pageType} 으로 rewrite
    return `http://${this.partnerSubdomain}.localhost:3000/${this.pageType}`;
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url, { waitUntil: 'load' });
  }
}
