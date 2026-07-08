
import {
  IDatabase,
  IKVStore,
  IQueue,
  ISecretsManager,
  IRateLimiter,
  IWriteQueue,
  ILogger,
  ITracer,
  IIdentityProvider,
  ILMSProvider,
  IEmailProvider,
  IPaymentProvider,
  IDocumentGenerator,
  INotificationService,
  IStorage,
} from '@bmi/ports';

import {
  D1DatabaseAdapter,
  CloudflareKVAdapter,
  CloudflareQueueAdapter,
  CloudflareRateLimiterAdapter,
  CloudflareWriteQueueAdapter,
  EnvironmentSecretsAdapter,
  CloudflareLoggerAdapter,
  CloudflareTracerAdapter,
  ResendEmailAdapter,
  CloudflareR2StorageAdapter,
  MemoryIdentityAdapter,
  MemoryLMSAdapter,
  MemoryEmailAdapter,
  MemoryPaymentAdapter,
  MemoryDocumentAdapter,
  MemoryNotificationAdapter,
  MemoryStorageAdapter,
  // Infrastructure adapters
  MemoryDatabaseAdapter,
  MemoryKVAdapter,
  InMemoryQueueAdapter,
  MemoryRateLimiterAdapter,
  MemoryWriteQueueAdapter,
  MemorySecretsAdapter,
  PostgresDatabaseAdapter,
  PostgresRateLimiterAdapter,
  PostgresWriteQueueAdapter,
  RedisAdapter,
  SQSAdapter,
  AWSSecretsAdapter,
  KeycloakAdapter,
  MoodleAdapter,
  MailcowAdapter,
  StripeAdapter,
  PdfDocumentAdapter,
} from '@bmi/adapters';

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export interface PlatformContext {
  db: IDatabase;
  kv: IKVStore;
  queue: IQueue;
  secrets: ISecretsManager;
  rateLimiter: IRateLimiter;
  writeQueue: IWriteQueue;
  logger: ILogger;
  tracer: ITracer;
  identity: IIdentityProvider;
  lms: ILMSProvider;
  email: IEmailProvider;
  payment: IPaymentProvider;
  document: IDocumentGenerator;
  notification: INotificationService;
  storage: IStorage;
  shutdown?: () => Promise<void>;
}

export function bootstrap(env: any): PlatformContext {
  const provider = env.PLATFORM_PROVIDER || 'cloudflare';
  switch (provider) {
    case 'cloudflare':
      return buildCloudflare(env);
    case 'aws':
      return buildAWS(env);
    case 'local':
      return buildLocal(env);
    case 'open':
      return buildOpen(env);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function buildCloudflare(env: any): PlatformContext {
  const tracer = new CloudflareTracerAdapter();
  
  // Email provider: use Resend if API key is available, else memory
  const emailProvider = env.RESEND_API_KEY 
    ? new ResendEmailAdapter(env.RESEND_API_KEY)
    : new MemoryEmailAdapter();
    
  // Storage provider: use R2 if bucket is available, else memory
  const storageProvider = env.R2_BUCKET && env.R2_PUBLIC_URL
    ? new CloudflareR2StorageAdapter(env.R2_BUCKET, env.R2_PUBLIC_URL)
    : new MemoryStorageAdapter();

  return {
    db: new D1DatabaseAdapter(env.DB),
    kv: new CloudflareKVAdapter(env.KV),
    queue: new CloudflareQueueAdapter(env.EMAIL_QUEUE || env.QUEUE),
    rateLimiter: new CloudflareRateLimiterAdapter(env.RATE_LIMITER),
    writeQueue: new CloudflareWriteQueueAdapter(env.WRITE_QUEUE),
    secrets: new EnvironmentSecretsAdapter(env),
    logger: new CloudflareLoggerAdapter(tracer.getRequestId()),
    tracer,
    identity: new MemoryIdentityAdapter(), // TODO: replace with Keycloak/Okta adapter
    lms: new MemoryLMSAdapter(), // TODO: replace with Moodle/Canvas adapter
    email: emailProvider,
    payment: new MemoryPaymentAdapter(), // TODO: replace with Stripe/PayPal adapter
    document: new MemoryDocumentAdapter(), // TODO: replace with pdf-lib/Puppeteer adapter
    notification: new MemoryNotificationAdapter(), // TODO: replace with Twilio/Slack adapter
    storage: storageProvider,
  };
}

function buildLocal(env: any): PlatformContext {
  const tracer = new CloudflareTracerAdapter();
  return {
    db: new MemoryDatabaseAdapter(),
    kv: new MemoryKVAdapter(),
    queue: new InMemoryQueueAdapter(),
    rateLimiter: new MemoryRateLimiterAdapter(),
    writeQueue: new MemoryWriteQueueAdapter(),
    secrets: new MemorySecretsAdapter(env),
    logger: new CloudflareLoggerAdapter(tracer.getRequestId()),
    tracer,
    identity: new MemoryIdentityAdapter(),
    lms: new MemoryLMSAdapter(),
    email: new MemoryEmailAdapter(),
    payment: new MemoryPaymentAdapter(),
    document: new MemoryDocumentAdapter(),
    notification: new MemoryNotificationAdapter(),
    storage: new MemoryStorageAdapter(),
  };
}

function buildAWS(env: any): PlatformContext {
  const tracer = new CloudflareTracerAdapter();
  
  const pgPool = new Pool({ connectionString: env.DATABASE_URL });
  const redisClient = new Redis(env.REDIS_URL);
  const sqsClient = new SQSClient({ region: env.AWS_REGION });
  const secretsClient = new SecretsManagerClient({ region: env.AWS_REGION });

  return {
    db: new PostgresDatabaseAdapter(pgPool),
    kv: new RedisAdapter(redisClient),
    queue: new SQSAdapter(sqsClient, env.SQS_QUEUE_URL),
    rateLimiter: new PostgresRateLimiterAdapter(pgPool),
    writeQueue: new PostgresWriteQueueAdapter(pgPool),
    secrets: new AWSSecretsAdapter(secretsClient),
    logger: new CloudflareLoggerAdapter(tracer.getRequestId()),
    tracer,
    identity: new MemoryIdentityAdapter(),
    lms: new MemoryLMSAdapter(),
    email: new MemoryEmailAdapter(),
    payment: new MemoryPaymentAdapter(),
    document: new MemoryDocumentAdapter(),
    notification: new MemoryNotificationAdapter(),
    storage: new MemoryStorageAdapter(),
    shutdown: async () => {
      await pgPool.end();
      redisClient.disconnect();
    },
  };
}

function buildOpen(env: any): PlatformContext {
  const tracer = new CloudflareTracerAdapter();
  
  const pgPool = new Pool({ connectionString: env.DATABASE_URL });
  const redisClient = new Redis(env.REDIS_URL);

  return {
    db: new PostgresDatabaseAdapter(pgPool),
    kv: new RedisAdapter(redisClient),
    queue: new InMemoryQueueAdapter(), // Can use RabbitMQ or Redis queues in future
    rateLimiter: new PostgresRateLimiterAdapter(pgPool),
    writeQueue: new PostgresWriteQueueAdapter(pgPool),
    secrets: new EnvironmentSecretsAdapter(env),
    logger: new CloudflareLoggerAdapter(tracer.getRequestId()),
    tracer,
    identity: new KeycloakAdapter(env.KEYCLOAK_URL, env.KEYCLOAK_REALM || 'bmi', env.KEYCLOAK_CLIENT || 'bmi-client', env.KEYCLOAK_SECRET || ''),
    lms: new MoodleAdapter(env.MOODLE_URL, env.MOODLE_TOKEN),
    email: new MailcowAdapter(env.MAILCOW_URL, env.MAILCOW_API_KEY),
    payment: env.STRIPE_SECRET_KEY ? new StripeAdapter(env.STRIPE_SECRET_KEY) : new MemoryPaymentAdapter(),
    document: new PdfDocumentAdapter(),
    notification: new MemoryNotificationAdapter(),
    storage: new MemoryStorageAdapter(),
    shutdown: async () => {
      await pgPool.end();
      redisClient.disconnect();
    },
  };
}
