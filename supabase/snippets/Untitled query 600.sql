  CREATE POLICY "leads_public_insert" ON leads
    FOR INSERT TO anon
    WITH CHECK (
      partner_id IN (SELECT id FROM partners WHERE is_active = true)
    );