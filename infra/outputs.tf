output "s3_bucket_name" {
  description = "S3 bucket for static site objects"
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "deploy_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC deploy"
  value       = aws_iam_role.github_deploy.arn
}

output "site_url" {
  description = "Public site URL"
  value       = "https://${var.domain_name}/"
}

output "aws_region" {
  description = "Primary AWS region"
  value       = var.aws_region
}

output "chat_proxy_url" {
  description = "Public chat SSE proxy base URL"
  value       = "https://${local.chat_proxy_domain}/api/chat"
}

output "chat_proxy_health_url" {
  description = "Chat proxy health check URL"
  value       = "https://${local.chat_proxy_domain}/health"
}

output "chat_proxy_instance_id" {
  description = "EC2 instance ID for the chat proxy"
  value       = aws_instance.chat_proxy.id
}

output "chat_proxy_artifact_bucket" {
  description = "S3 bucket for chat-proxy release artifacts"
  value       = aws_s3_bucket.chat_proxy_artifacts.bucket
}

output "chat_proxy_artifact_key" {
  description = "S3 object key for the chat-proxy bundle"
  value       = local.chat_proxy_artifact_key
}
