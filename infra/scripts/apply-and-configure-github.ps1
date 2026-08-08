#Requires -Version 5.1
<#
.SYNOPSIS
  terraform apply 후 GitHub environment aws-static 에 secret/variables 를 등록합니다.

.NOTES
  사전: aws configure (또는 AWS_* env), gh auth login, terraform PATH
#>
$ErrorActionPreference = 'Stop'

$infraRoot = Split-Path -Parent $PSScriptRoot
Set-Location $infraRoot

Write-Host 'Checking AWS identity...'
aws sts get-caller-identity | Out-Host

Write-Host 'terraform init...'
terraform init

Write-Host 'terraform apply...'
terraform apply -auto-approve

$roleArn = terraform output -raw deploy_role_arn
$region = terraform output -raw aws_region
$bucket = terraform output -raw s3_bucket_name
$distributionId = terraform output -raw cloudfront_distribution_id
$siteUrl = terraform output -raw site_url

Write-Host 'Ensuring GitHub environment aws-static...'
gh api --method PUT "repos/GWANGUIAN/stream/environments/aws-static" | Out-Null

Write-Host 'Setting GitHub secrets/variables on environment aws-static...'
gh secret set AWS_DEPLOY_ROLE_ARN --env aws-static --body $roleArn
gh variable set AWS_REGION --env aws-static --body $region
gh variable set AWS_S3_BUCKET --env aws-static --body $bucket
gh variable set AWS_CLOUDFRONT_DISTRIBUTION_ID --env aws-static --body $distributionId

Write-Host ''
Write-Host "Done. Site: $siteUrl"
Write-Host 'Next: GitHub Actions → Deploy AWS Static → Run workflow'
Write-Host "  gh workflow run aws-static.yml"
