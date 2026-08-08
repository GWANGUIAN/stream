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
