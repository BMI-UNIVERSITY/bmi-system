# Production Secrets Management

For production deployments, storing secrets in plain text `.env` files introduces security risks, especially if the file is accidentally committed or if server access is compromised.

## Recommended Solutions

### 1. HashiCorp Vault (Self-Hosted)
For fully self-hosted, air-gapped environments:
- Deploy HashiCorp Vault.
- Update `backend/Dockerfile` to use a Vault agent or an init script that fetches secrets via the Vault API at boot time.
- Inject `JWT_SECRET`, `ENCRYPTION_KEY`, and `PB_ENCRYPTION_KEY` directly into the node process memory.

### 2. Doppler (SaaS)
For cloud-based deployments:
- Use the Doppler CLI in the Docker container entrypoint.
- Run the API with `doppler run -- node dist/index.js`.
- This removes the need for `.env` files entirely on production servers.

### 3. Docker Secrets (Swarm/Compose)
For minimal dependency setups:
- Define secrets in `docker-compose.yml`:
  ```yaml
  secrets:
    jwt_secret:
      file: ./secrets/jwt_secret.txt
  ```
- Modify the backend to read from `/run/secrets/jwt_secret` if `process.env.JWT_SECRET` is not set.

## Key Rotation
Secrets must be rotated periodically. Ensure that `CERT_SIGNING_SECRET` and `JWT_SECRET` are rotated independently to prevent mass user logout during certificate key rotation.
