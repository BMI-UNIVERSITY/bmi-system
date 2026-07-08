import { IEmailProvider, Mailbox, EmailMessage } from '@bmi/ports';

export class MailcowAdapter implements IEmailProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
  }

  private async request(path: string, method: string = 'GET', body?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Mailcow API error: ${JSON.stringify(data)}`);
    }
    return data;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    console.log(`[MailcowAdapter] Mock sending email to ${message.to}: ${message.subject}`);
  }

  async createMailbox(userId: string, email: string, password: string): Promise<Mailbox> {
    try {
      const parts = email.split('@');
      await this.request('/api/v1/add/mailbox', 'POST', {
        local_part: parts[0],
        domain: parts[1],
        name: userId,
        password: password,
        active: 1,
      });
      return { id: email, email, userId, isActive: true };
    } catch (e) {
      console.error(e);
      throw new Error('Failed to create mailbox');
    }
  }

  async deleteMailbox(email: string): Promise<void> {
    try {
      await this.request('/api/v1/delete/mailbox', 'POST', [email]);
    } catch (e) {
      console.error(e);
      throw new Error('Failed to delete mailbox');
    }
  }

  async resetMailboxPassword(email: string, newPassword: string): Promise<void> {
    try {
      await this.request('/api/v1/edit/mailbox', 'POST', {
        attr: { password: newPassword },
        items: [email]
      });
    } catch (e) {
      console.error(e);
      throw new Error('Failed to reset mailbox password');
    }
  }
}
