-- hero_image_url의 형식을 함께 검사합니다.
SELECT id, subdomain, hero_image_url
FROM partners
WHERE is_active = true
  AND (hero_image_url IS NOT NULL AND hero_image_url NOT LIKE 'https://%');