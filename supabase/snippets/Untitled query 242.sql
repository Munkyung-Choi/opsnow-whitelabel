-- 1. partner-c (EcoGrow) -> Green(#1A5835) 테마 적용
INSERT INTO partners (id, business_name, subdomain, primary_color, secondary_color)
VALUES (
  gen_random_uuid(), 
  'EcoGrow', 
  'partner-c', 
  '#1A5835', 
  '#F0FDF4'
);

-- 2. partner-d (BrightMind) -> Orange(#D23F01) 테마 적용
INSERT INTO partners (id, business_name, subdomain, primary_color, secondary_color)
VALUES (
  gen_random_uuid(), 
  'BrightMind', 
  'partner-d', 
  '#D23F01', 
  '#FFF7ED'
);