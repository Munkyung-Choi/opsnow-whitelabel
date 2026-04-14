/**
 * [Locale Layout]
 *
 * 역할 1) <div lang={locale}> 래퍼 — CSS :lang() 가상 클래스 트리거
 *   - display:contents 로 선언하여 레이아웃(flex/grid)에 영향 없음
 *   - globals.css의 :lang() 규칙이 이 wrapper를 기준으로 하위 전체에 폰트 적용
 *
 * 역할 2) 로케일별 폰트 CDN 조건부 로드
 *   - ko / en : Pretendard (root layout.tsx에서 이미 로드)
 *   - ja      : Noto Sans JP — Google Fonts CDN (일본 접근 가능)
 *   - zh      : 시스템 폰트 우선 (Google Fonts CDN은 중국 내 차단)
 *
 * Next.js App Router 동작: 컴포넌트 트리 내 <link rel="stylesheet">는
 * 자동으로 <head>로 호이스팅되고 중복 제거됩니다.
 */

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  return (
    <>
      {/* Noto Sans JP — ja 로케일 전용 조건부 로드 */}
      {locale === 'ja' && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap"
          />
        </>
      )}

      {/* display:contents — 레이아웃에 영향 없이 lang 속성만 제공 */}
      <div lang={locale} className="contents">
        {children}
      </div>
    </>
  );
}
