-- WL-124: partners.features 원자적 업데이트 함수 (R2 대응 — JSONB 병합 레이스 방지)
-- SECURITY INVOKER: 호출자(master_admin) RLS 컨텍스트에서 실행됨

CREATE OR REPLACE FUNCTION public.update_partner_feature(
  p_partner_id UUID,
  p_feature_key TEXT,
  p_enabled BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.partners
  SET features = features || jsonb_build_object(p_feature_key, p_enabled),
      updated_at = NOW()
  WHERE id = p_partner_id;
END;
$$;
