
import { IEmailProvider, Mailbox, EmailMessage } from '@bmi/ports';

export class ResendEmailAdapter implements IEmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createMailbox(userId: string, email: string, password: string): Promise<Mailbox> {
    throw new Error('Resend does not support mailbox creation directly. Use a separate email service like Mailcow or Google Workspace for mailboxes.');
  }

  async deleteMailbox(email: string): Promise<void> {
    throw new Error('Resend does not support mailbox management.');
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from || 'BMI University <noreply@hkmministries.org>',
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
        cc: message.cc,
        bcc: message.bcc,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${response.status} ${error}`);
    }
  }

  async resetMailboxPassword(email: string, newPassword: string): Promise<void> {
    throw new Error('Resend does not support mailbox password management.');
  }
}
