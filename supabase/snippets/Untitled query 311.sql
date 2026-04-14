-- seed UUID와 일치하지 않는 기존 유저들 정리
DELETE FROM auth.users
WHERE email IN (
  'master@test.opsnow.com',
  'admin@cloudsave.test',
  'admin@dataflow.test',
  'admin@greensave.test',
  'admin@orangecloud.test'
)
AND id NOT IN (
  '762b0245-de65-46e5-ab27-b1c7bf8aaa29',
  '6adb5034-0a0e-4f60-bbd3-b1286a071473',
  'fab084cd-5921-44f6-85b1-a13a01d3cfd4',
  'c3000000-0000-0000-0000-000000000001',
  'd4000000-0000-0000-0000-000000000001'
);