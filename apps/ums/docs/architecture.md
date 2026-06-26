# BMI UMS — Architecture

## Component overview

```mermaid
graph TB
  Browser["Browser / Mobile App"]
  Caddy["Caddy reverse proxy<br/>(TLS termination, CSP, rate limit)"]
  API["Hono.js API<br/>(JWT auth, RBAC, business logic)"]
  PB["PocketBase<br/>(SQLite, auth, collections)"]
  Ollama["Ollama<br/>(Local LLM — internal only)"]
  LS["Litestream<br/>(Continuous WAL replication)"]
  S3["S3-compatible bucket<br/>(off-site backup)"]

  Browser -->|HTTPS| Caddy
  Caddy -->|/api/*| API
  Caddy -.->|"/_/* → 403"| PB
  API -->|PocketBase SDK| PB
  API -->|Ollama HTTP| Ollama
  PB -->|WAL stream| LS
  LS -->|replicate| S3
```

## Network security model

All services except Caddy use `expose:` not `ports:`. PocketBase and Ollama are not reachable
from outside the Docker bridge network. Ollama is further locked to `OLLAMA_ORIGINS=http://api:3001`.

## Scalability ceiling

SQLite via PocketBase supports approximately 5,000 concurrent users with this architecture.
