terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  # ─── Remote State Backend (Cloudflare R2) ──────────────────────────────────
  # Stores Terraform state in R2 to enable collaboration and prevent drift.
  # State locking is handled by S3-compatible locking via DynamoDB equivalent.
  # SETUP: Run `terraform init` after creating the R2 bucket "bmi-terraform-state"
  # in the Cloudflare dashboard and setting these env vars:
  #   AWS_ACCESS_KEY_ID     → R2 Access Key ID
  #   AWS_SECRET_ACCESS_KEY → R2 Secret Access Key
  backend "s3" {
    bucket                      = "bmi-terraform-state"
    key                         = "prod/terraform.tfstate"
    region                      = "auto"
    endpoint                    = "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true

    # DynamoDB-style locking: prevents concurrent `terraform apply` runs.
    # Create a DynamoDB table named "bmi-terraform-lock" (or use Cloudflare KV as a lock via a wrapper).
    # For pure R2, use the `tfstate-lock` approach or HCP Terraform for free state locking.
    use_lockfile = true
  }
}


provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "zone_id" {
  description = "Cloudflare Zone ID (for DNS records, etc.)"
  type        = string
  default     = null
}

# D1 Database
resource "cloudflare_d1_database" "bmi_portal_db" {
  account_id = var.account_id
  name       = "bmi-portal-db"
}

# R2 Buckets
resource "cloudflare_r2_bucket" "documents" {
  account_id = var.account_id
  name       = "bmi-portal-documents"
}

resource "cloudflare_r2_bucket" "backups" {
  account_id = var.account_id
  name       = "bmi-portal-backups"
}

# KV Namespaces
# NOTE: The bmi-portal-sessions KV namespace was removed from this configuration.
# Session management was fully migrated to D1 (see: apps/api/migrations/0008_add_session_version.sql).
# The wrangler.jsonc Worker binding has no kv_namespaces block.

# AUTH_KEYS KV — stores active + previous JWT signing keys for 30-day rotation
resource "cloudflare_workers_kv_namespace" "auth_keys" {
  account_id = var.account_id
  title      = "bmi-auth-keys"
}

output "auth_keys_kv_id" {
  description = "KV namespace ID for AUTH_KEYS — paste into wrangler.jsonc of bmi-auth"
  value       = cloudflare_workers_kv_namespace.auth_keys.id
}

