'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { Partner } from '@/services/partnerService';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/proxy';

interface GlobalNavProps {
  partner: Partner;
  locale: Locale;
}

function LogoArea({ partner }: { partner: Partner }) {
  if (partner.logo_url) {
    return (
      /* FIXED: logo_url은 파트너가 업로드한 고정 이미지 — bg-primary 사용 불가 */
      <Image
        src={partner.logo_url}
        alt={`${partner.business_name} 로고`}
        width={160}
        height={40}
        className="h-10 w-auto object-contain"
      />
    );
  }
  return (
    <span className="text-xl font-bold text-primary">
      {partner.business_name}
    </span>
  );
}

export default function GlobalNav({ partner, locale }: GlobalNavProps) {
  const t = getDictionary(locale).nav;
  const [open, setOpen] = useState(false);

  // WL-40: Confluence 화면 설계서 Section 1 기준 네비게이션 링크
  const NAV_LINKS = [
    { label: '제품 소개', href: '#how-it-works' },
    { label: '핵심 기능', href: '#core-engines' },
    { label: '자주 묻는 질문', href: '#faq' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#home" aria-label={`${partner.business_name} 홈`}>
          <LogoArea partner={partner} />
        </a>

        {/* 데스크톱 메뉴 */}
        <ul className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Button asChild size="sm">
            <a href="#contact">{t.cta}</a>
          </Button>
        </div>

        {/* 모바일 메뉴 */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t.openMenu}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b pb-4">
                <LogoArea partner={partner} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label={t.closeMenu}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ul className="mt-6 flex flex-col gap-4">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="block text-base font-medium text-foreground"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <Button className="w-full" asChild>
                  <a href="#contact" onClick={() => setOpen(false)}>
                    {t.cta}
                  </a>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
