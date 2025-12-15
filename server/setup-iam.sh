#!/bin/bash
# Setup IAM role and instance profile for Elastic Beanstalk

set -e

ROLE_NAME="aws-elasticbeanstalk-ec2-role"
INSTANCE_PROFILE_NAME="aws-elasticbeanstalk-ec2-role"

echo "🔐 Setting up IAM role and instance profile for Elastic Beanstalk..."

# Check if role exists
if aws iam get-role --role-name "${ROLE_NAME}" &>/dev/null; then
    echo "✅ IAM role '${ROLE_NAME}' already exists"
else
    echo "📝 Creating IAM role..."
    # Create trust policy
    cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create the role
    aws iam create-role \
        --role-name "${ROLE_NAME}" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --description "Default EC2 role for Elastic Beanstalk"

    # Attach managed policies
    echo "📎 Attaching managed policies..."
    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier \
        || echo "Policy may already be attached"

    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkWorkerTier \
        || echo "Policy may already be attached"

    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker \
        || echo "Policy may already be attached"

    echo "✅ IAM role created"
fi

# Check if instance profile exists
if aws iam get-instance-profile --instance-profile-name "${INSTANCE_PROFILE_NAME}" &>/dev/null; then
    echo "✅ Instance profile '${INSTANCE_PROFILE_NAME}' already exists"
    
    # Check if role is attached to instance profile
    if ! aws iam get-instance-profile --instance-profile-name "${INSTANCE_PROFILE_NAME}" \
        --query 'InstanceProfile.Roles[?RoleName==`'"${ROLE_NAME}"'`]' \
        --output text | grep -q "${ROLE_NAME}"; then
        echo "📎 Adding role to instance profile..."
        aws iam add-role-to-instance-profile \
            --instance-profile-name "${INSTANCE_PROFILE_NAME}" \
            --role-name "${ROLE_NAME}"
    fi
else
    echo "📝 Creating instance profile..."
    aws iam create-instance-profile \
        --instance-profile-name "${INSTANCE_PROFILE_NAME}"

    echo "📎 Adding role to instance profile..."
    aws iam add-role-to-instance-profile \
        --instance-profile-name "${INSTANCE_PROFILE_NAME}" \
        --role-name "${ROLE_NAME}"

    echo "⏳ Waiting for instance profile to be ready..."
    sleep 5
    echo "✅ Instance profile created"
fi

echo ""
echo "✅ IAM setup complete!"
echo "Role: ${ROLE_NAME}"
echo "Instance Profile: ${INSTANCE_PROFILE_NAME}"

