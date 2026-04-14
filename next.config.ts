import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // 파트너 로고 플레이스홀더 (개발/테스트 전용)
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      // Supabase Storage — 파트너 업로드 이미지 (logo, hero image 등) — 호스팅 환경
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Supabase Storage — 로컬 개발 환경
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
