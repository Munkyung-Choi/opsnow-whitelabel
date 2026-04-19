  SELECT subdomain, business_name, is_active, owner_id, created_at
  FROM public.partners
  WHERE subdomain IN ('partner-a', 'partner-b', 'partner-c', 'partner-d')
  ORDER BY subdomain;