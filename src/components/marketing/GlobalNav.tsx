'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { Partner } from '@/services/partnerService';

interface GlobalNavProps {
  partner: Partner;
}

const NAV_LINKS = [
  { label: '홈', href: '#home' },
  { label: '서비스 소개', href: '#features' },
  { label: '파트너 소개', href: '#about' },
  { label: '문의하기', href: '#contact' },
];

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

export default function GlobalNav({ partner }: GlobalNavProps) {
  const [open, setOpen] = useState(false);

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
            <a href="#contact">무료 진단 신청</a>
          </Button>
        </div>

        {/* 모바일 메뉴 */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기">
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
                  aria-label="메뉴 닫기"
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
                    무료 진단 신청
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
