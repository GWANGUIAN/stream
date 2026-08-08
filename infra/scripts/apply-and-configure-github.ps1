#Requires -Version 5.1
<#
.SYNOPSIS
  terraform apply 후 GitHub repository secrets/variables 를 등록합니다.

.NOTES
  사전: aws configure (또는 AWS_* env), gh auth login, terraform PATH
#>
$ErrorActionPreference = 'Stop'

$infraRoot = Split-Path -Parent $PSScriptRoot
Set-Location $infraRoot

$env:Path = "$env:ProgramFiles\Amazon\AWSCLIV2;$env:LOCALAPPDATA\Microsoft\WinGet\Links;" + $env:Path

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
$chatProxyBucket = terraform output -raw chat_proxy_artifact_bucket
$chatProxyInstanceId = terraform output -raw chat_proxy_instance_id
$chatProxyUrl = terraform output -raw chat_proxy_url

Write-Host 'Setting GitHub repository secrets/variables...'
gh secret set AWS_DEPLOY_ROLE_ARN --body $roleArn
gh variable set AWS_REGION --body $region
gh variable set AWS_S3_BUCKET --body $bucket
gh variable set AWS_CLOUDFRONT_DISTRIBUTION_ID --body $distributionId
gh variable set AWS_CHAT_PROXY_ARTIFACT_BUCKET --body $chatProxyBucket
gh variable set AWS_CHAT_PROXY_INSTANCE_ID --body $chatProxyInstanceId
gh variable set NEXT_PUBLIC_CHAT_SSE_BASE --body $chatProxyUrl

Write-Host ''
Write-Host "Done. Site: $siteUrl"
Write-Host "Chat proxy: $chatProxyUrl"
Write-Host 'Next:'
Write-Host '  gh workflow run aws-chat-proxy.yml'
Write-Host '  gh workflow run aws-static.yml'
Write-Host '  gh workflow run pages.yml'
