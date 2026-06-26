# Branch Protection Configuration Guide

This document describes the **recommended branch protection rules** for the BMI UMS repository.
Apply these settings in **GitHub → Repository Settings → Branches → Branch protection rules**.

## Protected Branches

### `main` (production)

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Require a pull request before merging** | ✅ Enabled | No direct pushes to main |
| **Required approving reviews** | 1 | Minimum one human review before merge |
| **Dismiss stale reviews on new commits** | ✅ Enabled | Prevents stale approvals after fixes |
| **Require review from Code Owners** | ✅ Enabled | Enforces CODEOWNERS for security-critical paths |
| **Require status checks to pass** | ✅ Enabled | All CI jobs must be green |
| **Required status checks** | `lint`, `typecheck`, `test-backend`, `test-frontend`, `docker-build` | Full gate |
| **Require branches to be up to date** | ✅ Enabled | Prevents out-of-date merges |
| **Require conversation resolution** | ✅ Enabled | All review comments must be resolved |
| **Restrict who can push** | Repository admins only | Nobody pushes directly |
| **Allow force pushes** | ❌ Disabled | Immutable history on main |
| **Allow deletions** | ❌ Disabled | Branch cannot be deleted |

### `develop` (integration / staging)

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Require a pull request before merging** | ✅ Enabled | Feature branches merge via PR |
| **Required approving reviews** | 1 | At least one review |
| **Require status checks to pass** | ✅ Enabled | Minimum: `lint`, `typecheck`, `test-backend`, `test-frontend` |
| **Allow force pushes** | ❌ Disabled | Stable shared history |
| **Allow deletions** | ❌ Disabled | Branch is permanent |

## Commit Signing (Optional but Recommended)

Enable **"Require signed commits"** on `main` to enforce GPG/SSH commit signatures,
providing proof that commits originate from authenticated contributors.

## Merge Strategy

Prefer **Squash and Merge** for feature branches into `develop` to keep history clean.
Use **Merge Commit** for `develop → main` promotions to preserve the merge point.

## Rulesets (GitHub Enterprise / Advanced)

If using GitHub Enterprise, convert the above into a **Repository Ruleset** with:
- `bypass_actors`: `[]` (no bypass list — no exceptions)
- `enforcement`: `active`
- `target`: `~DEFAULT_BRANCH` for main

## Applying via GitHub CLI

```bash
# Require pull request + 1 review + up-to-date branch on main
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --field required_status_checks='{"strict":true,"contexts":["lint","typecheck","test-backend","test-frontend"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null
```

> **Note:** Run this once after enabling branch protection in the GitHub UI, or include it
> in your infrastructure-as-code (e.g., Terraform `github_branch_protection` resource).
