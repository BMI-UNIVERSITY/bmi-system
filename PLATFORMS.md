# Zero Platform Lock-in Architecture

The BMI System relies on a Hexagonal Architecture (Ports and Adapters) pattern to maintain 100% platform independence. The core business logic interacts solely with standardized interfaces (`@bmi/ports`), allowing the system to easily switch between infrastructure providers (e.g., Cloudflare Workers, AWS Lambda, local environments) via `@bmi/adapters` and `@bmi/bootstrap`.

## Architecture Overview

1. **Ports (`@bmi/ports`)**: Defines the interfaces for services like Database, Key-Value Store, Queues, Rate Limiting, Secrets, and Logging.
2. **Adapters (`@bmi/adapters`)**: Contains platform-specific implementations of these interfaces.
3. **Bootstrap (`@bmi/bootstrap`)**: A factory that dynamically selects the correct set of adapters based on the environment and injects them into the application context.

---

## 1. Cloudflare Workers (Default Production)

This is the default platform optimized for edge execution.

### Features
- **Database**: D1 (via `D1DatabaseAdapter`)
- **Key-Value Store**: Workers KV (via `CloudflareKVAdapter`)
- **Queues**: Cloudflare Queues (via `CloudflareQueueAdapter`)
- **Rate Limiting / Writes**: Durable Objects (via `CloudflareRateLimiterAdapter`, `CloudflareWriteQueueAdapter`)
- **Secrets**: Cloudflare Environment Variables (via `EnvironmentSecretsAdapter`)

### Deployment
Set the platform provider in `wrangler.jsonc` (or implicitly via Cloudflare defaults):
```json
{
  "vars": {
    "PLATFORM_PROVIDER": "cloudflare"
  }
}
```
Run deployment using Wrangler:
```bash
npm run deploy --workspace=@bmi/api
```

---

## 2. Local Environment (Development)

The local environment relies entirely on in-memory adapters and local files, meaning you do not need Cloudflare emulator processes for unit testing or basic local development.

### Features
- **Database**: In-Memory SQLite / Mock (via `MemoryDatabaseAdapter`)
- **Key-Value Store**: In-Memory Map (via `MemoryKVAdapter`) or Local File System (via `FileSystemKVAdapter`)
- **Queues**: In-Memory Array (via `InMemoryQueueAdapter`)
- **Rate Limiting / Writes**: Local Sets and Arrays
- **Secrets**: Local `.env` (via `LocalSecretsAdapter`)

### Usage
Set the environment variable locally before running development scripts:
```bash
PLATFORM_PROVIDER=local npm run dev --workspace=@bmi/api
```

---

## 3. AWS / Conventional Servers (Future-Ready)

If you plan to deploy the API to AWS Lambda, ECS, or a traditional VPS, the bootstrap factory is configured to inject AWS-compatible adapters.

### Features
- **Database**: PostgreSQL (via `PostgresDatabaseAdapter`)
- **Key-Value Store**: Redis (via `RedisAdapter`)
- **Queues**: AWS SQS (via `SQSAdapter`)
- **Rate Limiting**: Redis (via `RedisAdapter`)
- **Secrets**: AWS Secrets Manager (via `AWSSecretsAdapter`)

### Usage
Set the necessary AWS environment variables and connections strings, and set the provider:
```bash
PLATFORM_PROVIDER=aws \
DATABASE_URL=postgres://user:pass@host:5432/db \
REDIS_URL=redis://host:6379 \
npm run start
```

## Adding New Platforms

To add support for a new platform (e.g., Google Cloud Platform):
1. Implement the required interfaces from `@bmi/ports` in `@bmi/adapters/src/gcp/`.
2. Update `@bmi/bootstrap/src/index.ts` to recognize the `PLATFORM_PROVIDER === 'gcp'`.
3. Map the GCP adapters in the factory.
