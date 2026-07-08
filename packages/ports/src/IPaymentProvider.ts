
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  clientSecret?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentIntentInput {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface IPaymentProvider {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
  getPaymentIntent(id: string): Promise<PaymentIntent | null>;
  cancelPaymentIntent(id: string): Promise<PaymentIntent>;
  handleWebhook(payload: any, signature: string): Promise<PaymentIntent>;
}
