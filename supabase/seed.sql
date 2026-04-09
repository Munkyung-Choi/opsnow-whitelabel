-- [1] DB 제약 조건 수정 (master 권한 허용)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('master', 'partner_admin', 'master_admin'));

-- [2] 파트너 데이터 생성 (subdomain 추가)
INSERT INTO public.partners (id, business_name, subdomain, owner_id)
VALUES 
    ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'Partner A', 'partner-a', '6adb5034-0a0e-4f60-bbd3-b1286a071473'),
    ('9309979b-9211-457e-ad01-68e843c7687b', 'Partner B', 'partner-b', 'fab084cd-5921-44f6-85b1-a13a01d3cfd4')
ON CONFLICT (id) DO UPDATE SET 
    owner_id = EXCLUDED.owner_id,
    subdomain = EXCLUDED.subdomain;

-- [3] 사용자 프로필 데이터 생성 및 권한 부여
INSERT INTO public.profiles (id, role, partner_id)
VALUES 
    ('762b0245-de65-46e5-ab27-b1c7bf8aaa29', 'master', NULL),
    ('6adb5034-0a0e-4f60-bbd3-b1286a071473', 'partner_admin', 'b03e99fd-9cec-4ab3-a2c5-3462562f84f2'),
    ('fab084cd-5921-44f6-85b1-a13a01d3cfd4', 'partner_admin', '9309979b-9211-457e-ad01-68e843c7687b')
ON CONFLICT (id) DO UPDATE SET 
    role = EXCLUDED.role, 
    partner_id = EXCLUDED.partner_id;