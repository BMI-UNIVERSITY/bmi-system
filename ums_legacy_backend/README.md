# BMI UMS Backend API - 100% Open Source

## Overview

This is the backend API for the BMI University Management System, built with 100% open-source technologies.

## Technology Stack

| Component | Technology | License |
|-----------|------------|---------|
| Framework | Hono.js | MIT |
| Database | SQLite (via PocketBase) | Public Domain |
| Auth | PocketBase Auth | MIT |
| AI/LLM | Ollama + Llama 3.2 | MIT |
| Encryption | CryptoJS | MIT |
| Logging | Winston | MIT |

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **AI Assistant**: Local LLM via Ollama (no data leaves your server)
- **Data Encryption**: AES-256 encryption for sensitive data
- **Audit Logging**: Comprehensive audit trail for all actions
- **Rate Limiting**: Built-in rate limiting for API protection
- **Input Validation**: Zod schema validation for all inputs

## Prerequisites

- Node.js 20+
- PocketBase (auto-downloaded)
- Ollama (for AI features)

## Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Development

```bash
# Start PocketBase in one terminal
./pocketbase serve

# Start Ollama in another terminal
ollama serve

# Start the API server
npm run dev
```

### Database schema (PocketBase)

Collections are created automatically on API startup via `src/services/pocketbase.ts` (`setupCollections()`). Use **snake_case** fields and relations as defined there — do not run deprecated root `scripts/migrate-db.ts` or `backend/scripts/setup-collections.ts` without reading `docs/SCHEMA_SETUP.md`.

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register (admin only)
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### AI
- `POST /api/v1/ai/chat` - Chat with AI assistant
- `POST /api/v1/ai/completions` - OpenAI-compatible completions
- `GET /api/v1/ai/health` - Check AI service health

### Students
- `GET /api/v1/students` - List students
- `GET /api/v1/students/:id` - Get student
- `POST /api/v1/students` - Create student (admin/registrar)
- `PATCH /api/v1/students/:id` - Update student
- `DELETE /api/v1/students/:id` - Delete student (admin only)
- `GET /api/v1/students/stats/overview` - Student statistics

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `JWT_SECRET` | JWT signing secret | (required) |
| `ENCRYPTION_KEY` | Data encryption key | (required) |
| `POCKETBASE_URL` | PocketBase URL | http://127.0.0.1:8090 |
| `OLLAMA_URL` | Ollama API URL | http://127.0.0.1:11434 |
| `OLLAMA_MODEL` | LLM model name | llama3.2 |

## Security

- All passwords hashed with bcrypt (12 rounds)
- JWT tokens with expiration
- AES-256 encryption for sensitive data
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Input sanitization with Zod
- Audit logging for all actions

## License

MIT License - See LICENSE file for details
