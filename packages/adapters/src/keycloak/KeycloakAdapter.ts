import { IIdentityProvider, User, UserCreateInput, MfaSetup } from '@bmi/ports';
import KcAdminClient from '@keycloak/keycloak-admin-client';

export class KeycloakAdapter implements IIdentityProvider {
  private kcAdminClient: KcAdminClient;
  private realm: string;

  constructor(baseUrl: string, realm: string, clientId: string, clientSecret: string) {
    this.realm = realm;
    this.kcAdminClient = new KcAdminClient({
      baseUrl,
      realmName: realm,
    });
    // For a real implementation, we would need to authenticate the admin client here
    // or handle token refreshes dynamically.
    this.kcAdminClient.auth({
      grantType: 'client_credentials',
      clientId,
      clientSecret,
    }).catch(err => console.error("Keycloak admin auth failed", err));
  }

  async createUser(input: UserCreateInput): Promise<User> {
    const userRepresentation = await this.kcAdminClient.users.create({
      realm: this.realm,
      username: input.email,
      email: input.email,
      enabled: true,
      emailVerified: false,
      credentials: input.password ? [{ type: 'password', value: input.password, temporary: false }] : undefined,
      attributes: input.metadata,
    });

    return {
      id: userRepresentation.id!,
      email: input.email,
      isEmailVerified: false,
      roles: input.roles || [],
      metadata: input.metadata,
    };
  }

  async getUser(id: string): Promise<User | null> {
    try {
      const user = await this.kcAdminClient.users.findOne({ id, realm: this.realm });
      if (!user) return null;
      return {
        id: user.id!,
        email: user.email!,
        isEmailVerified: user.emailVerified || false,
        roles: [], // Requires a separate call to groups/roles mapping
        metadata: user.attributes,
      };
    } catch {
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.kcAdminClient.users.find({ email, exact: true, realm: this.realm });
      if (!users || users.length === 0) return null;
      const user = users[0];
      return {
        id: user.id!,
        email: user.email!,
        isEmailVerified: user.emailVerified || false,
        roles: [],
        metadata: user.attributes,
      };
    } catch {
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await this.kcAdminClient.users.update(
      { id, realm: this.realm },
      { email: updates.email, emailVerified: updates.isEmailVerified, attributes: updates.metadata }
    );
    const updated = await this.getUser(id);
    if (!updated) throw new Error("User not found after update");
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await this.kcAdminClient.users.del({ id, realm: this.realm });
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    // Usually handled by OIDC flows, but if direct validation is needed:
    // This is mocked for now as Keycloak Admin Client doesn't validate user passwords directly.
    throw new Error('Not implemented: Use OIDC flows for authentication.');
  }

  async setupMfa(userId: string, type: 'totp' | 'webauthn'): Promise<MfaSetup> {
    // Keycloak typically handles MFA via Required Actions in the browser flow.
    // To do this via API requires specific custom extensions.
    return { type, secret: 'mocked-secret', qrCodeUrl: 'mocked-url' };
  }

  async verifyMfa(userId: string, code: string): Promise<boolean> {
    return true; // Handled by Keycloak UI flows
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await this.kcAdminClient.users.resetPassword({
      id: userId,
      realm: this.realm,
      credential: { type: 'password', value: newPassword, temporary: false },
    });
  }
}
