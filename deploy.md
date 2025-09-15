# AI Research Summarizer - AWS Cloud Project

## Project Overview

A web application where users upload research publication PDFs to get AI-generated summaries in real time. The project leverages AWS cloud services to host and scale the application efficiently.

---

## AWS Requirements Completed

### 1. EC2 Instance Setup (Requirement 1)
- Created an Ubuntu EC2 instance.
- Installed Python, FastAPI backend, and necessary dependencies.
- Configured security group to allow incoming traffic on port 8000.
- Launched the backend application on the instance.

### 2. Auto Scaling Configuration (Requirement 2)
- Created a Launch Template based on the EC2 instance configuration.
- Created an Auto Scaling Group (ASG) with:
  - Minimum capacity: 1
  - Desired capacity: 1
  - Maximum capacity: 3
- Configured the ASG to automatically scale instances based on demand.

### 3. Static Frontend Hosting on S3 (Requirement 3)
- Hosted the frontend (HTML, CSS, JS) as a static website on an Amazon S3 bucket.
- Configured the bucket for static website hosting.
- Set proper permissions for public read access on the bucket objects.

### 4. IAM Users and Policies (Requirement 4)
- Created IAM users:
  - Admin user with full access (policy: AdministratorAccess).
  - Team members grouped in a restricted IAM group.
- Created and attached custom IAM policies for the team members allowing:
  - Start/Stop EC2 instances.
  - Read-only access to S3 buckets.
- Used JSON policy documents to define permissions.

---

## Users and Policies Summary

| User/Group        | Permissions                              |
|-------------------|----------------------------------------|
| Admin user        | Full access to all AWS resources       |
| Team Members Group| Start/Stop EC2, read-only S3 access    |

---

Admin policy
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
```

User policy
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:DescribeInstances"
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": "*"
    }
  ]
}

```


- Future enhancements could include integrating Amazon RDS for metadata storage, CloudFront CDN, or SNS for notifications.

