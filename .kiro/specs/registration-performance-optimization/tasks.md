# Implementation Plan: Student Registration Performance Optimization (Free Tier Optimized)

## Overview

Ruthlessly prioritized performance optimization for BMI student registration workflow, accounting for Cloudflare Free Tier constraints. Focus on critical bottlenecks that impact user experience while respecting quota limits.

**Free Tier Constraints:**
- Workers: 100k requests/day
- D1: 5M reads, 100k writes/day, 10 connections max
- CPU: 10ms limit per request
- Queues: 1M operations/month

## Tasks

- [x] 1. **CRITICAL: Email Queue Implementation (Blocks Everything)**
  - Move all email sending (verification, notifications) to Cloudflare Queues
  - Update `apps/api/routes/auth.ts` handleRegister to queue emails instead of await
  - Update `apps/api/routes/apply.ts` handleSubmitApplication for async emails
  - Create Queue Consumer Worker for Resend API integration
  - Reduces API response time from ~600ms to ~50ms (12x improvement)

- [x] 2. **CRITICAL: Database Indexes for Registration Flow**
  - Add missing indexes on `users(email)`, `applications(user_id)`, `applications(status)`
  - Add composite indexes for common query patterns
  - Add indexes on `email_verifications(token)`, `applications(application_number)`
  - Run during maintenance window to avoid SQLITE_BUSY errors
  - Prevents full-table scans that kill 10ms CPU budget

- [ ] 3. **CRITICAL: API Async Processing**
  - Move non-essential operations (lifecycle events, webhooks) to background
  - Implement immediate response with 202 Accepted for long operations
  - Use ctx.waitUntil for non-blocking background tasks
  - Optimize rate limiting to reduce CPU overhead
  - Target: API responses under 1 second

- [ ] 4. **HIGH: Frontend Auto-Save Quota Protection**
  - Implement strict debouncing: minimum 30-second intervals
  - Only auto-save when form is >50% complete
  - Clear draft entries after successful submission
  - Add quota-aware localStorage fallback
  - Prevent burning 14k+ writes/day on drafts alone

- [ ] 5. **HIGH: Load Testing & WriteQueue Validation**
  - Run k6 load testing against staging environment
  - Test 100 concurrent registrations scenario
  - Validate zero SQLITE_BUSY errors under load
  - Confirm WriteQueue batching is working correctly
  - Essential before DNS cutover

- [ ] 6. **MEDIUM: Strategic Read Parallelization**
  - Use Promise.all for independent read operations only
  - Fetch user data + program data simultaneously
  - Never parallelize D1 writes (must use WriteQueue)
  - Cache program catalog using Cloudflare Cache API
  - Reduce sequential query latency

- [ ] 7. **MEDIUM: Lightweight Monitoring**
  - Use existing Sentry + structured JSON logs
  - Add key performance metrics without heavy APM
  - Monitor WriteQueue batch efficiency
  - Track D1 quota usage (reads/writes/day)
  - Avoid third-party analytics that consume Worker requests

- [x] 8. **DEFER: Frontend UX Polish**
  - Real-time validation (client-side only - no API calls)
  - Progress indicators and error feedback
  - Session timeout warnings
  - Network status indicators
  - Only after critical performance issues resolved

## Task Dependency Graph

```
Task 1 (Email Queue) → Task 3 (API Async) → Task 5 (Load Testing)
Task 2 (DB Indexes) → Task 6 (Read Parallel) → Task 5 (Load Testing)
Task 4 (Auto-Save) → Task 8 (UX Polish)
Task 7 (Monitoring) → Task 5 (Load Testing)
```

## Notes

**Success Criteria (Free Tier Realistic):**
- Page load times: <3 seconds (achievable with Cache API)
- API response times: <1 second (achievable with async emails)
- First-time submission success rate: 99.9% (achievable with WriteQueue)
- Zero SQLITE_BUSY errors during peak usage (validated via load testing)
- Email delivery within 2 minutes (acceptable for verification emails)

**Critical Free Tier Guidelines:**
1. **Never await email sends in request path** - Use Queues
2. **Never auto-save more than once every 30 seconds** - Protect write quota  
3. **Never run Promise.all for D1 writes** - Use WriteQueue
4. **Always cache program catalog** - Changes yearly, not daily
5. **Always add indexes for WHERE clauses** - D1 has no query optimizer

**Current Architecture Strengths (Already Implemented):**
- WriteQueue Durable Object for connection pooling
- Structured logging with performance tracking
- Cache API strategy for static data
- CSRF protection with memory storage
- Rate limiting with cleanup

**Immediate Action Items:**
1. Email Queue Consumer (Task 1) - Highest impact optimization
2. Database indexes (Task 2) - Prevents CPU timeouts  
3. Load testing (Task 5) - Validates architecture before cutover