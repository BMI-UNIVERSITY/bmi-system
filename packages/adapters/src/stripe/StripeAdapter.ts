import { IPaymentProvider, PaymentIntent, CreatePaymentIntentInput } from '@bmi/ports';
import Stripe from 'stripe';

export class StripeAdapter implements IPaymentProvider {
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100),
      currency: input.currency.toLowerCase(),
      metadata: input.metadata,
      description: input.description,
    });

    return {
      id: intent.id,
      amount: intent.amount / 100,
      currency: intent.currency,
      status: this.mapStatus(intent.status),
      clientSecret: intent.client_secret || undefined,
    };
  }

  async getPaymentIntent(id: string): Promise<PaymentIntent | null> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(id);
      return {
        id: intent.id,
        amount: intent.amount / 100,
        currency: intent.currency,
        status: this.mapStatus(intent.status),
        clientSecret: intent.client_secret || undefined,
      };
    } catch {
      return null;
    }
  }

  async cancelPaymentIntent(id: string): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.cancel(id);
    return {
      id: intent.id,
      amount: intent.amount / 100,
      currency: intent.currency,
      status: this.mapStatus(intent.status),
    };
  }

  async handleWebhook(payload: any, signature: string): Promise<PaymentIntent> {
    // This is a simplified webhook handler.
    // Real implementation requires verifying the stripe signature against the raw body.
    const intent = payload.data.object as Stripe.PaymentIntent;
    return {
      id: intent.id,
      amount: intent.amount / 100,
      currency: intent.currency,
      status: this.mapStatus(intent.status),
    };
  }

  private mapStatus(stripeStatus: string): PaymentIntent['status'] {
    switch (stripeStatus) {
      case 'succeeded': return 'succeeded';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'pending';
      case 'canceled': return 'canceled';
      default: return 'failed';
    }
  }
}
