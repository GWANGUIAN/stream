# AWS static hosting (`streamcontent.click`)

S3 + CloudFront + ACM + Route 53 + GitHub Actions OIDC.

GitHub Pages (`https://gwanguian.github.io/stream/`) 와 **병행**합니다.
AWS는 루트 경로(`/`, `/roulette/`, …), Pages는 `/stream/...` 를 유지합니다.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Route 53에 `streamcontent.click` Hosted Zone (도메인 구매 시 보통 자동 생성)
- 로컬 AWS 자격 증명 (아래 **B. Access Key**)

## Apply infra

```bash
cd infra
terraform init
terraform plan
terraform apply
```

한 번에 apply + GitHub environment 등록 (PowerShell):

```powershell
# 먼저: aws configure  &&  gh auth login
.\infra\scripts\apply-and-configure-github.ps1
gh workflow run aws-static.yml
```

주요 outputs:

| Output | GitHub에 등록 |
| --- | --- |
| `deploy_role_arn` | Secret `AWS_DEPLOY_ROLE_ARN` |
| `aws_region` | Variable `AWS_REGION` |
| `s3_bucket_name` | Variable `AWS_S3_BUCKET` |
| `cloudfront_distribution_id` | Variable `AWS_CLOUDFRONT_DISTRIBUTION_ID` |

이미 계정에 GitHub OIDC provider가 있으면 apply가 충돌할 수 있습니다.
그때는 provider ARN을 넘겨 재사용합니다:

```hcl
# terraform.tfvars
github_oidc_provider_arn = "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
```

## GitHub 설정

1. 저장소 → **Settings → Environments → New environment** → 이름 `aws-static`
2. Environment / repository Secrets:
   - `AWS_DEPLOY_ROLE_ARN` = `terraform output -raw deploy_role_arn`
3. Environment / repository Variables:
   - `AWS_REGION` = `terraform output -raw aws_region`
   - `AWS_S3_BUCKET` = `terraform output -raw s3_bucket_name`
   - `AWS_CLOUDFRONT_DISTRIBUTION_ID` = `terraform output -raw cloudfront_distribution_id`
4. Actions에서 **Deploy AWS Static** → Run workflow (`workflow_dispatch`)

CLI로 등록 예시 (`gh` 사용):

```bash
gh secret set AWS_DEPLOY_ROLE_ARN --env aws-static --body "$(terraform -chdir=infra output -raw deploy_role_arn)"
gh variable set AWS_REGION --env aws-static --body "$(terraform -chdir=infra output -raw aws_region)"
gh variable set AWS_S3_BUCKET --env aws-static --body "$(terraform -chdir=infra output -raw s3_bucket_name)"
gh variable set AWS_CLOUDFRONT_DISTRIBUTION_ID --env aws-static --body "$(terraform -chdir=infra output -raw cloudfront_distribution_id)"
```

## A. GitHub Actions OIDC (배포용, 권장)

장기 Access Key를 GitHub에 넣지 **않습니다**. Terraform이 만드는 IAM role을
Actions가 OIDC로 assume 합니다.

워크플로: [`.github/workflows/aws-static.yml`](../.github/workflows/aws-static.yml)

- `permissions.id-token: write`
- `aws-actions/configure-aws-credentials` + `role-to-assume`
- trust: `repo:GWANGUIAN/stream:ref:refs/heads/main` 및 environment `aws-static`

수동으로 IdP만 만들려면 (Terraform이 보통 처리):

1. IAM → Identity providers → Add provider → OpenID Connect
2. Provider URL: `https://token.actions.githubusercontent.com`
3. Audience: `sts.amazonaws.com`

## B. 로컬 Terraform용 Access Key

GitHub Secrets가 아니라 **본인 PC / 에이전트 실행용**입니다.

1. AWS Console → IAM → Users → Create user (예: `stream-admin-local`)
2. 권한: 초기에는 `AdministratorAccess` (또는 IAM + S3 + CloudFront + Route53 + ACM)
3. Security credentials → **Create access key** → Command Line Interface (CLI)
4. Access key ID / Secret access key 저장 (Secret은 다시 볼 수 없음)
5. 설정:

```powershell
aws configure
# Default region name: ap-northeast-2
```

또는:

```powershell
$env:AWS_ACCESS_KEY_ID="..."
$env:AWS_SECRET_ACCESS_KEY="..."
$env:AWS_DEFAULT_REGION="ap-northeast-2"
```

6. 확인: `aws sts get-caller-identity`
7. **절대 커밋하지 말 것.** apply 후 권한 축소 또는 키 삭제 권장.

에이전트에게 맡길 때: 채팅에 키를 붙여넣기보다 `aws configure` 후 “배포 진행해줘”가 안전합니다.

## C. 도메인 확인

1. Route 53 → Registered domains → `streamcontent.click` = Active
2. Hosted zones에 동일 이름 public zone 존재
3. 도메인의 Name servers = Hosted zone NS 레코드와 일치
4. `terraform apply` 후 ACM DNS validation이 Issued 되는지 확인
5. `https://streamcontent.click/` 접속

## D. 첫 배포 체크리스트

1. `aws configure` (또는 env) 완료
2. `cd infra && terraform apply`
3. GitHub environment `aws-static` + secret/variables 등록
4. Actions → Deploy AWS Static → Run workflow
5. `https://streamcontent.click/`, `/roulette/`, `/poll/`, `/sentence/` 확인
6. Pages URL (`…/stream/…`) 회귀 확인

## Notes

- Terraform state는 기본 로컬(`infra/terraform.tfstate`, gitignore). 팀 사용 시 S3 backend 추가 권장.
- ACM 인증서는 CloudFront 때문에 **us-east-1** 에 생성됩니다.
- 정적 호스팅이라 앱 API 라우트는 포함되지 않습니다 (Pages와 동일).
