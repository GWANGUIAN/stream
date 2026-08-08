locals {
  chat_proxy_domain     = "chat.${var.domain_name}"
  chat_proxy_artifact_key = "releases/chat-proxy/server.mjs"
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "aws_s3_bucket" "chat_proxy_artifacts" {
  bucket = "${var.project_name}-chat-proxy-${data.aws_caller_identity.current.account_id}"
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "chat_proxy_artifacts" {
  bucket = aws_s3_bucket.chat_proxy_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "chat_proxy_artifacts" {
  bucket = aws_s3_bucket.chat_proxy_artifacts.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "chat_proxy_artifacts" {
  bucket = aws_s3_bucket.chat_proxy_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_security_group" "chat_proxy" {
  name        = "${var.project_name}-chat-proxy"
  description = "Chat SSE proxy (HTTP/HTTPS only)"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP for ACME and redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_iam_role" "chat_proxy" {
  name = "${var.project_name}-chat-proxy"
  tags = local.common_tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "chat_proxy_ssm" {
  role       = aws_iam_role.chat_proxy.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "chat_proxy_artifacts_read" {
  statement {
    sid    = "ReadArtifacts"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.chat_proxy_artifacts.arn,
      "${aws_s3_bucket.chat_proxy_artifacts.arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "chat_proxy_artifacts_read" {
  name   = "${var.project_name}-chat-proxy-artifacts"
  role   = aws_iam_role.chat_proxy.id
  policy = data.aws_iam_policy_document.chat_proxy_artifacts_read.json
}

resource "aws_iam_instance_profile" "chat_proxy" {
  name = "${var.project_name}-chat-proxy"
  role = aws_iam_role.chat_proxy.name
  tags = local.common_tags
}

resource "aws_eip" "chat_proxy" {
  domain = "vpc"
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-chat-proxy"
  })
}

resource "aws_instance" "chat_proxy" {
  ami                         = data.aws_ssm_parameter.al2023_arm64.value
  instance_type               = "t4g.nano"
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.chat_proxy.id]
  iam_instance_profile        = aws_iam_instance_profile.chat_proxy.name
  associate_public_ip_address = true

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/templates/chat-proxy-user-data.sh.tftpl", {
    chat_proxy_domain = local.chat_proxy_domain
    artifact_bucket   = aws_s3_bucket.chat_proxy_artifacts.bucket
    artifact_key      = local.chat_proxy_artifact_key
    aws_region        = var.aws_region
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-chat-proxy"
  })

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip_association" "chat_proxy" {
  instance_id   = aws_instance.chat_proxy.id
  allocation_id = aws_eip.chat_proxy.id
}

resource "aws_route53_record" "chat_proxy" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.chat_proxy_domain
  type    = "A"
  ttl     = 60
  records = [aws_eip.chat_proxy.public_ip]
}
