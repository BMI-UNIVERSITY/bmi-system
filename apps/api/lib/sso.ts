import type { Env } from './types';
import { getPortalUrl } from './config';

export type OAuthProvider = 'google' | 'github' | 'microsoft';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified?: boolean;
}

export function getOAuthConfig(provider: OAuthProvider, env: Env): OAuthConfig {
  const baseUrl = getPortalUrl(env);
  const redirectUri = `${baseUrl}/api/auth/oauth/${provider}/callback`;
  
  const configs: Record<OAuthProvider, Partial<OAuthConfig>> = {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scope: 'openid email profile',
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      redirectUri,
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scope: 'user:email',
    },
    microsoft: {
      clientId: env.MICROSOFT_CLIENT_ID,
      clientSecret: env.MICROSOFT_CLIENT_SECRET,
      redirectUri,
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scope: 'openid email profile',
    }
  };

  return configs[provider] as OAuthConfig;
}

export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string,
  config: OAuthConfig
): Promise<string> {
  let body;
  
  if (provider === 'github') {
    body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    });
  } else {
    body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    });
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: provider === 'github' 
      ? { 'Accept': 'application/json' } 
      : { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data: Record<string, any> = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to exchange code');
  }
  return data.access_token;
}

export async function getUserInfo(
  provider: OAuthProvider,
  accessToken: string,
  config: OAuthConfig
): Promise<UserInfo> {
  const response = await fetch(config.userInfoUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const data: Record<string, any> = await response.json();
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  switch (provider) {
    case 'google':
      return {
        id: data.sub,
        email: data.email,
        firstName: data.given_name || data.name.split(' ')[0],
        lastName: data.family_name || data.name.split(' ').slice(1).join(' '),
        emailVerified: data.email_verified,
      };
    case 'github': {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      });
      const emails = await emailRes.json();
      const primaryEmail = (emails as any[]).find((e: any) => e.primary)?.email || data.email;
      return {
        id: data.id.toString(),
        email: primaryEmail,
        firstName: data.name?.split(' ')[0] || data.login,
        lastName: data.name?.split(' ').slice(1).join(' ') || '',
        emailVerified: true,
      };
    }
    case 'microsoft':
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        firstName: data.givenName || data.displayName?.split(' ')[0],
        lastName: data.surname || data.displayName?.split(' ').slice(1).join(' '),
        emailVerified: true,
      };
    default:
      throw new Error('Unsupported provider');
  }
}
