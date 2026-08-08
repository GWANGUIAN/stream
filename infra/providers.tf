provider "aws" {
  region = var.aws_region
}

# CloudFront용 ACM 인증서는 반드시 us-east-1 에 있어야 합니다.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
