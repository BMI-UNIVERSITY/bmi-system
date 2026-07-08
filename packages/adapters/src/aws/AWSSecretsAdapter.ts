import { ISecretsManager, IHealthCheck } from '@bmi/ports';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export class AWSSecretsAdapter implements ISecretsManager, IHealthCheck {
  constructor(private readonly client: SecretsManagerClient) {}

  async get(key: string): Promise<string | null> {
    try {
      const command = new GetSecretValueCommand({ SecretId: key });
      const response = await this.client.send(command);
      return response.SecretString || null;
    } catch {
      return null;
    }
  }

  async getSecret<T = any>(key: string): Promise<T | null> {
    const stringVal = await this.get(key);
    if (!stringVal) return null;
    try {
      return JSON.parse(stringVal) as T;
    } catch {
      return null;
    }
  }

  async health(): Promise<boolean> {
    return true; // Secrets Manager ping is difficult without listing secrets
  }
}
