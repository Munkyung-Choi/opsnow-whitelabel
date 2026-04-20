import { z } from 'zod';

export const leadSchema = z.object({
  customer_name: z.string().min(1, '이름을 입력해 주세요.'),
  company_name: z.string().optional(),
  email: z.string().email('유효한 이메일 주소를 입력해 주세요.'),
  phone: z.string().optional(),
  cloud_usage_amount: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export interface LeadFormState {
  status: 'idle' | 'success' | 'error';
  fieldErrors?: Record<string, string[]>;
  message?: string;
}
