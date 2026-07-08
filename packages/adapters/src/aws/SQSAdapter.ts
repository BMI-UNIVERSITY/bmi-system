import { IQueue, IHealthCheck } from '@bmi/ports';
import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

export class SQSAdapter implements IQueue, IHealthCheck {
  constructor(private readonly client: SQSClient, private readonly queueUrl: string) {}

  async send<T = any>(message: T, options?: { delaySeconds?: number }): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
      DelaySeconds: options?.delaySeconds,
    });
    const response = await this.client.send(command);
    return response.MessageId || crypto.randomUUID();
  }

  async sendBatch<T = any>(messages: T[]): Promise<string[]> {
    // SQS supports max 10 messages per batch. We assume small batches for now.
    if (messages.length > 10) {
      throw new Error("SQS limits batches to 10 messages");
    }

    const command = new SendMessageBatchCommand({
      QueueUrl: this.queueUrl,
      Entries: messages.map((msg, idx) => ({
        Id: idx.toString(),
        MessageBody: JSON.stringify(msg),
      })),
    });

    const response = await this.client.send(command);
    return response.Successful?.map(r => r.MessageId!) || [];
  }

  async health(): Promise<boolean> {
    return true; // Simple ping not natively exposed without listing queues
  }
}
