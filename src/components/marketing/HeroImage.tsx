'use client';

/**
 * HeroSection의 이미지 전용 Leaf Client Component.
 *
 * 이유: next/image의 onError는 브라우저 이벤트이므로 Server Component에서 사용 불가.
 * RSC 원칙에 따라 최말단(Leaf) 노드로만 분리한다.
 */

import Image from 'next/image';
import { useState } from 'react';

interface HeroImageProps {
  src: string;
  alt: string;
}

export default function HeroImage({ src, alt }: HeroImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // 이미지 로드 실패 시 테마 색상 기반 플레이스홀더
    return (
      <div
        className="h-64 w-full rounded-xl bg-primary/15 lg:h-auto"
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1400}
      height={1046}
      className="h-auto w-full object-contain"
      // 2-column grid 레이아웃: 모바일 100vw, 데스크톱 약 50vw
      // next/image가 w=3840 등 과도한 srcset 항목을 생성하지 않도록 힌트 제공
      sizes="(max-width: 1024px) 100vw, 50vw"
      priority
      onError={() => setFailed(true)}
    />
  );
}
