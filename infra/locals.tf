locals {
  www_domain   = "www.${var.domain_name}"
  bucket_name  = "${var.project_name}-static-${data.aws_caller_identity.current.account_id}"
  common_tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
  # count=0 일 때 [0] 접근을 피하기 위해 length로 분기합니다.
  github_oidc_provider_arn = length(aws_iam_openid_connect_provider.github) > 0 ? aws_iam_openid_connect_provider.github[0].arn : var.github_oidc_provider_arn
}
