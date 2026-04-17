# Local Development Environment

멀티 테넌트 로컬 개발 환경 구성 가이드. **신규 개발자는 아래 절차를 순서대로 따른다.**

## 1. Acrylic DNS Proxy 설치 (Windows — 1회 설정)

`*.localhost` 및 `*.opsnow.test` 와일드카드 DNS를 로컬에서 동작시키기 위한 설정이다.  
hosts 파일 수동 수정 없이 모든 파트너 서브도메인(`partner-a.localhost`, `partner-a.opsnow.test` 등)을 즉시 사용할 수 있다.  
> **왜 `.local`이 아닌 `.test`인가?** `.local`은 Windows/macOS가 mDNS(Bonjour)용으로 선점하여 Acrylic DNS가 개입하지 못한다. `.test`는 IANA가 테스트 목적으로 예약한 TLD로 mDNS 간섭이 없다.

**1. 설치**
```
https://mayakron.altervista.org/support/acrylic/Home.htm
```
설치 파일 다운로드 후 관리자 권한으로 실행.

**2. AcrylicHosts.txt에 와일드카드 추가**  
Acrylic UI 실행 → `Open Acrylic Hosts` 클릭 후 맨 아래에 추가:
```
127.0.0.1  *.localhost
127.0.0.1  *.opsnow.test
```

**3. Windows DNS 서버를 Acrylic으로 변경**
```
설정 → 네트워크 및 인터넷 → 어댑터 옵션 변경
→ 사용 중인 어댑터 우클릭 → 속성 → IPv4 → 속성
→ "다음 DNS 서버 주소 사용" → 기본 설정 DNS: 127.0.0.1
```

**4. 서비스 재시작** (관리자 PowerShell)
```powershell
Restart-Service AcrylicDNSProxySvc
```

**5. 설치 검증**
```powershell
nslookup partner-a.localhost
# 기대 결과: Address: 127.0.0.1
```

## 2. 로컬 파트너 페이지 접근

Acrylic DNS 설정 완료 + 개발 서버(`npm run dev`) 실행 후:

```
http://{partner-subdomain}.localhost:3000
```

- `partner-subdomain`은 Supabase `partners.subdomain` 컬럼 값과 일치해야 한다.
- `is_active = true`인 파트너만 접근 가능하다.
- 미존재 슬러그 접근 시 `/not-found`로 리다이렉트된다.

## 3. CI/CD 환경 Fallback

서브도메인 접근이 불가한 CI/CD 환경에서는 서버 전용 환경변수를 사용한다:

```bash
# .env.local (NEXT_PUBLIC_ 접두사 없음 — 클라이언트 번들에 노출되지 않음)
DEV_PARTNER_SLUG=partner-a
```

`http://localhost:3000` 접근 시 해당 파트너 페이지로 자동 리라이트된다.
