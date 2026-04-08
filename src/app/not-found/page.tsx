export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">설정 대기 중</h1>
        <p className="text-gray-500 text-sm">
          아직 연결되지 않은 도메인입니다.
          <br />
          파트너 관리자에게 문의하거나 잠시 후 다시 시도해 주세요.
        </p>
      </div>
    </div>
  );
}
