resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project_name}-site-oac"
  description                       = "OAC for ${var.domain_name} static site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "www_redirect" {
  name    = "${var.project_name}-www-redirect"
  runtime = "cloudfront-js-2.0"
  comment = "www→apex redirect + directory index.html rewrite for S3 OAC"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var host = request.headers.host.value;
      if (host === '${local.www_domain}') {
        var location = 'https://${var.domain_name}' + request.uri;
        if (request.querystring && Object.keys(request.querystring).length > 0) {
          var params = [];
          for (var key in request.querystring) {
            if (!Object.prototype.hasOwnProperty.call(request.querystring, key)) continue;
            var q = request.querystring[key];
            if (q.multiValue) {
              for (var i = 0; i < q.multiValue.length; i++) {
                params.push(encodeURIComponent(key) + (q.multiValue[i].value ? '=' + encodeURIComponent(q.multiValue[i].value) : ''));
              }
            } else if (q.value) {
              params.push(encodeURIComponent(key) + '=' + encodeURIComponent(q.value));
            } else {
              params.push(encodeURIComponent(key));
            }
          }
          if (params.length > 0) {
            location += '?' + params.join('&');
          }
        }
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            location: { value: location }
          }
        };
      }

      // S3 REST origin: default_root_object applies only to "/".
      // Next trailingSlash builds need "/path/" → "/path/index.html".
      var uri = request.uri;
      if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
      } else if (!uri.includes('.')) {
        request.uri = uri + '/index.html';
      }
      return request;
    }
  EOF
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} static site"
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  aliases             = [var.domain_name, local.www_domain]

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.www_redirect.arn
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # S3 OAC missing objects often surface as 403; map to a plain 404 without SPA fallback.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  tags = local.common_tags
}
