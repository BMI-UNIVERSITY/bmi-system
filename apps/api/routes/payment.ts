import { Env, ok, error, typedJson } from '../lib/types';

interface PaymentBody {
  amount?: number;
  reason?: string;
}

export async function handleCreatePaymentIntent(req: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await typedJson<PaymentBody>(req);
    const { amount, reason } = body;
    
    if (!amount) return error('Amount is required', 400);

    const intent = await env.PLATFORM_CONTEXT!.payment.createPaymentIntent({
      amount,
      currency: 'USD',
      description: reason,
      metadata: { userId }
    });
    return ok({ clientSecret: intent.clientSecret, intentId: intent.id });
  } catch (e: unknown) {
    return error('Failed to create payment intent', 500);
  }
}

export async function handlePaymentWebhook(req: Request, env: Env): Promise<Response> {
  try {
    const signature = req.headers.get('stripe-signature') || '';
    const payload = await req.text();
    const intent = await env.PLATFORM_CONTEXT!.payment.handleWebhook(payload, signature);
    return ok({ received: true, intentId: intent.id, status: intent.status });
  } catch (e: unknown) {
    return error('Webhook processing failed', 400);
  }
}
