export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted">
      <div className="text-center max-w-md px-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">설정 대기 중</h1>
        <p className="text-muted-foreground text-sm">
          아직 연결되지 않은 도메인입니다.
          <br />
          파트너 관리자에게 문의하거나 잠시 후 다시 시도해 주세요.
        </p>
      </div>
    </div>
  );
}
