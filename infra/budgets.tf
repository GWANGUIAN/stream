resource "aws_iam_role" "budgets_actions" {
  name = "${var.project_name}-budgets-actions"
  tags = local.common_tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "budgets.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "budgets_actions_ssm" {
  role       = aws_iam_role.budgets_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBudgetsActions_RolePolicyForResourceAdministrationWithSSM"
}

resource "aws_budgets_budget" "monthly" {
  name         = "${var.project_name}-monthly-20"
  budget_type  = "COST"
  limit_amount = "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_notification_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_notification_email]
  }
}

resource "aws_budgets_budget_action" "stop_chat_proxy" {
  budget_name       = aws_budgets_budget.monthly.name
  action_type       = "RUN_SSM_DOCUMENTS"
  approval_model    = "AUTOMATIC"
  notification_type = "ACTUAL"
  execution_role_arn = aws_iam_role.budgets_actions.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }

  definition {
    ssm_action_definition {
      action_sub_type = "STOP_EC2_INSTANCES"
      instance_ids    = [aws_instance.chat_proxy.id]
      region          = var.aws_region
    }
  }

  subscriber {
    address           = var.budget_notification_email
    subscription_type = "EMAIL"
  }
}
