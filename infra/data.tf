data "aws_caller_identity" "current" {}

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# GitHub Actions OIDC thumbprint (GitHub-managed; rarely changes).
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}
