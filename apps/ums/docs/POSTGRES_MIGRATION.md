# PostgreSQL Migration Plan

When the BMI-PORTAL scales beyond ~5,000 concurrent active users, or when multi-region horizontal scaling becomes necessary, migrating from PocketBase (SQLite) to a dedicated PostgreSQL database is required.

## Why Migrate?
- **SQLite Write Concurrency**: SQLite locks the database on writes. While Litestream provides streaming replication, high-frequency concurrent writes (e.g., mass grading periods) will eventually bottleneck.
- **Horizontal Scaling**: A stateless API container running behind a load balancer cannot easily share a local SQLite file (unless using LiteFS, but a dedicated DB is simpler).

## Target Architecture
- **Database**: Self-hosted PostgreSQL 16+ or managed RDS/Cloud SQL.
- **ORM**: Drizzle ORM or Prisma (Drizzle recommended for Edge/Hono compatibility).
- **Authentication**: Migrate from PocketBase Auth to an internal Auth service backed by PostgreSQL (e.g., Lucia Auth) or a managed provider (Clerk, Supabase Auth).

## Migration Steps

1. **Schema Translation**
   Extract the schema from PocketBase `collections.json` and convert it to Drizzle schemas (`schema.ts`).
2. **Data Export**
   Write a migration script using `better-sqlite3` to extract data from `pb_data/data.db` and stream it into the new PostgreSQL database using `pg` driver `COPY` statements.
3. **Application Rewrite**
   Replace `PocketBase` client calls in `backend/src/routes/` with standard Drizzle SQL queries.
4. **Zero-Downtime Cutover**
   - Take the app offline (Maintenance mode).
   - Perform final sync from Litestream to PostgreSQL.
   - Deploy new API container pointing to PostgreSQL.
   - Verify health metrics.
