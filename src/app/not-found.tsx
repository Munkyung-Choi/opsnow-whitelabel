import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 - Page Not Found',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center max-w-md px-4 space-y-4">
        <p className="text-8xl font-bold text-border select-none">404</p>
        <h1 className="text-2xl font-semibold text-foreground">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-muted-foreground text-sm">
          요청하신 페이지가 존재하지 않거나 접근 권한이 없습니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          홈으로 가기
        </Link>
      </div>
    </div>
  );
}
