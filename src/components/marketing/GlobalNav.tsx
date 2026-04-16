'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LanguageSelector } from '@/components/marketing/LanguageSelector';
import type { Partner } from '@/services/partnerService';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';

interface GlobalNavProps {
  partner: Partner;
  locale: Locale;
}

/** SVG 로고는 Next.js 이미지 최적화를 건너뛰어 그대로 서빙한다. */
function isSvgUrl(url: string) {
  return url.toLowerCase().endsWith('.svg');
}

function LogoArea({ partner }: { partner: Partner }) {
  if (partner.logo_url) {
    return (
      /* FIXED: logo_url은 파트너가 업로드한 고정 이미지 — 테마 색상 클래스 사용 불가 */
      <Image
        src={partner.logo_url}
        alt={`${partner.business_name} 로고`}
        width={128}
        height={24}
        className="h-6 w-auto object-contain"
        unoptimized={isSvgUrl(partner.logo_url)}
        priority
      />
    );
  }
  return (
    <span className="text-base font-bold text-foreground">
      {partner.business_name}
    </span>
  );
}

export default function GlobalNav({ partner, locale }: GlobalNavProps) {
  const t = getDictionary(locale).nav;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const homeHref = `/${locale}`;

  const NAV_LINKS = [
    { label: t.features, href: '#core-engines' },
    { label: t.process,  href: '#how-it-works' },
    { label: t.faq,      href: '#faq' },
  ];

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // 홈 페이지에서는 최상단으로 스크롤, 다른 페이지에서는 Link 기본 동작(홈 이동)에 위임
    if (pathname === homeHref || pathname === `${homeHref}/`) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">

        {/* 로고 */}
        <Link href={homeHref} onClick={handleLogoClick} aria-label={`${partner.business_name} 홈`}>
          <LogoArea partner={partner} />
        </Link>

        {/* 데스크톱 내비게이션 */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="주요 메뉴">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* 우측: 언어 선택 + 로그인 + CTA + 모바일 햄버거 */}
        <div className="flex items-center gap-2">
          <LanguageSelector
            locale={locale}
            publishedLocales={partner.published_locales}
            partnerId={partner.id}
          />

          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href="#contact">{t.login}</a>
          </Button>

          <Button size="sm" asChild>
            <a href="#contact">{t.cta}</a>
          </Button>

          {/* 모바일 햄버거 */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t.openMenu}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex h-full flex-col pt-2">
                <div className="border-b pb-4">
                  <LogoArea partner={partner} />
                </div>
                <ul className="mt-6 flex flex-col gap-4">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="block text-base font-medium text-foreground"
                        onClick={(e) => handleNavClick(e, link.href)}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-2 pb-4">
                  <Button variant="outline" className="w-full" asChild>
                    <a href="#contact" onClick={() => setOpen(false)}>
                      {t.login}
                    </a>
                  </Button>
                  <Button className="w-full" asChild>
                    <a href="#contact" onClick={() => setOpen(false)}>
                      {t.cta}
                    </a>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
