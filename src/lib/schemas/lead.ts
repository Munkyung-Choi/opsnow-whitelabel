import { z } from 'zod';

// WL-154: .strict() — unknown key 거부. service_role INSERT payload에
// 악의적 필드(특히 partner_id) 침투를 Zod 레이어에서 원천 차단한다.
export const leadSchema = z.object({
  customer_name: z.string().min(1, '이름을 입력해 주세요.'),
  company_name: z.string().optional(),
  email: z.string().email('유효한 이메일 주소를 입력해 주세요.'),
  phone: z.string().optional(),
  cloud_usage_amount: z.string().optional(),
}).strict();

export type LeadInput = z.infer<typeof leadSchema>;

export interface LeadFormState {
  status: 'idle' | 'success' | 'error';
  fieldErrors?: Record<string, string[]>;
  message?: string;
}
