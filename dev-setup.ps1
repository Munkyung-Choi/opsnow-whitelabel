# dev-setup.ps1 — OpsNow Whitelabel 로컬 개발 환경 초기화
#
# 사용법: 관리자 권한 PowerShell에서 실행
#   .\dev-setup.ps1
#
# 수행 작업:
#   1. Wi-Fi DNS를 Acrylic(127.0.0.1)으로 설정 — *.localhost / *.opsnow.test 해석 활성화
#   2. DNS 캐시 초기화
#   3. Next.js 개발 서버 시작
#
# 전제 조건:
#   - Acrylic DNS Proxy 설치 완료 (CLAUDE.md §10.1)
#   - AcrylicHosts.txt에 아래 두 줄 추가됨:
#       127.0.0.1  *.localhost
#       127.0.0.1  *.opsnow.test

param(
    [string]$Interface = "Wi-Fi"
)

Write-Host ""
Write-Host "=== OpsNow Whitelabel Dev Setup ===" -ForegroundColor Cyan

# 1. Acrylic 서비스 실행 중인지 확인
$svc = Get-Service -Name "AcrylicDNSProxySvc" -ErrorAction SilentlyContinue
if ($null -eq $svc) {
    Write-Host "[ERROR] Acrylic DNS Proxy 서비스를 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "        CLAUDE.md §10.1 을 참고하여 Acrylic을 설치하세요." -ForegroundColor Yellow
    exit 1
}
if ($svc.Status -ne "Running") {
    Write-Host "[INFO]  Acrylic 서비스 시작 중..." -ForegroundColor Yellow
    Start-Service -Name "AcrylicDNSProxySvc"
    Start-Sleep -Seconds 1
}
Write-Host "[OK]    Acrylic DNS Proxy 실행 중" -ForegroundColor Green

# 2. DNS 설정 — 이미 127.0.0.1이면 스킵
$current = (Get-DnsClientServerAddress -InterfaceAlias $Interface -AddressFamily IPv4).ServerAddresses
if ($current[0] -eq "127.0.0.1") {
    Write-Host "[OK]    DNS 이미 Acrylic으로 설정됨 ($Interface)" -ForegroundColor Green
} else {
    Set-DnsClientServerAddress -InterfaceAlias $Interface -ServerAddresses ("127.0.0.1", "168.126.63.1")
    Write-Host "[OK]    DNS 설정 완료: 127.0.0.1 (Acrylic) → 168.126.63.1 (KT, fallback)" -ForegroundColor Green
}

# 3. DNS 캐시 초기화
ipconfig /flushdns | Out-Null
Write-Host "[OK]    DNS 캐시 초기화 완료" -ForegroundColor Green

# 4. 접속 가능 URL 안내
Write-Host ""
Write-Host "접속 가능한 로컬 파트너 URL:" -ForegroundColor Cyan
Write-Host "  http://partner-a.localhost:3000"
Write-Host "  http://partner-a.opsnow.test:3000"
Write-Host ""

# 5. 개발 서버 시작
Write-Host "[START] npm run dev" -ForegroundColor Cyan
Write-Host ""
npm run dev
