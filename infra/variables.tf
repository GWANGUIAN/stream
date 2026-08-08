variable "aws_region" {
  description = "Primary AWS region for S3 and IAM resources"
  type        = string
  default     = "ap-northeast-2"
}

variable "domain_name" {
  description = "Apex domain for the static site"
  type        = string
  default     = "streamcontent.click"
}

variable "github_repository" {
  description = "GitHub repo in OWNER/REPO form trusted by the deploy OIDC role"
  type        = string
  default     = "GWANGUIAN/stream"
}

variable "github_branch" {
  description = "Git branch allowed to assume the deploy role"
  type        = string
  default     = "main"
}

variable "project_name" {
  description = "Short name used in resource tags and names"
  type        = string
  default     = "stream"
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN. Leave empty to create one."
  type        = string
  default     = ""
}

variable "budget_notification_email" {
  description = "Email for AWS Budgets alerts and the $20 stop-action subscriber"
  type        = string
}
