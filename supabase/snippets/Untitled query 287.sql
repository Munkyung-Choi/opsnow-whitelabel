-- 1. 먼저 대상 파트너가 있는지 확인 (결과가 아래에 뜨는지 보세요)
SELECT id, business_name, subdomain, primary_color 
FROM partners 
WHERE subdomain IN ('partner-a', 'partner-b');

-- 2. Partner A (초록 테마) 적용
UPDATE partners
SET primary_color   = '#16A34A',
    secondary_color = '#F0FDF4'
WHERE subdomain = 'partner-a';

-- 3. Partner B (오렌지 테마) 적용
UPDATE partners
SET primary_color   = '#EA580C',
    secondary_color = '#FFF7ED'
WHERE subdomain = 'partner-b';