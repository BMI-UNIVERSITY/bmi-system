import { makeEnv } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCreatePaymentIntent, handlePaymentWebhook } from './payment';

describe('Payment routes — handleCreatePaymentIntent', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('creates a payment intent successfully', async () => {
    const mockIntent = { id: 'pi_123', amount: 50, currency: 'USD', status: 'pending', clientSecret: 'secret_123' };
    env.PLATFORM_CONTEXT.payment.createPaymentIntent.mockResolvedValue(mockIntent);

    const req = new Request('http://localhost/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50, reason: 'Document fee' }),
    });
    const res = await handleCreatePaymentIntent(req, env, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.clientSecret).toBe('secret_123');
    expect(body.data.intentId).toBe('pi_123');
    expect(env.PLATFORM_CONTEXT.payment.createPaymentIntent).toHaveBeenCalledWith({
      amount: 50,
      currency: 'USD',
      description: 'Document fee',
      metadata: { userId: 'user-123' },
    });
  });

  it('returns 400 when amount is missing', async () => {
    const req = new Request('http://localhost/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'No amount' }),
    });
    const res = await handleCreatePaymentIntent(req, env, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(env.PLATFORM_CONTEXT.payment.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('returns 500 when payment adapter throws', async () => {
    env.PLATFORM_CONTEXT.payment.createPaymentIntent.mockRejectedValue(new Error('Stripe down'));

    const req = new Request('http://localhost/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 25, reason: 'Test' }),
    });
    const res = await handleCreatePaymentIntent(req, env, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

describe('Payment routes — handlePaymentWebhook', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('processes a valid webhook payload', async () => {
    const mockIntent = { id: 'pi_webhook_1', amount: 100, currency: 'USD', status: 'succeeded' };
    env.PLATFORM_CONTEXT.payment.handleWebhook.mockResolvedValue(mockIntent);

    const req = new Request('http://localhost/api/payment/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_sig',
      },
      body: JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_webhook_1' } } }),
    });
    const res = await handlePaymentWebhook(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.intentId).toBe('pi_webhook_1');
    expect(env.PLATFORM_CONTEXT.payment.handleWebhook).toHaveBeenCalled();
  });

  it('works without stripe-signature header (graceful)', async () => {
    const mockIntent = { id: 'pi_2', amount: 50, currency: 'USD', status: 'pending' };
    env.PLATFORM_CONTEXT.payment.handleWebhook.mockResolvedValue(mockIntent);

    const req = new Request('http://localhost/api/payment/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment_intent.created' }),
    });
    const res = await handlePaymentWebhook(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 400 when webhook processing fails', async () => {
    env.PLATFORM_CONTEXT.payment.handleWebhook.mockRejectedValue(new Error('Invalid signature'));

    const req = new Request('http://localhost/api/payment/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'bad_sig' },
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    });
    const res = await handlePaymentWebhook(req, env);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });
});
