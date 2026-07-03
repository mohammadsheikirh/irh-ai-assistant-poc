# IRH AI Assistant — Backend (POC)

Minimal, no-VPC setup: one Lambda behind a **Lambda Function URL** (skips API Gateway
entirely for the POC — fewer moving parts, still gives you a public HTTPS endpoint).

## 1. Enable a Bedrock model
In the AWS Console → Bedrock → Model access, enable an Anthropic Claude model
(e.g. `anthropic.claude-3-5-sonnet-20241022-v2:0`) in a supported region.

## 2. Create the S3 bucket
```bash
aws s3 mb s3://irh-ai-poc-<yourname> --region us-east-1
aws s3 cp knowledge_base.json s3://irh-ai-poc-<yourname>/knowledge/knowledge_base.json
aws s3 cp routing_table.json  s3://irh-ai-poc-<yourname>/knowledge/routing_table.json
```
This bucket holds:
- `knowledge/` — the approved IRH info + routing table (edit and re-upload any time,
  no redeploy needed)
- `engagement/` — every chat turn, meeting request, and team routing event, partitioned
  by date — this is your "engagement insights" data for the POC

## 3. Package and deploy the Lambda
```bash
mkdir build && cp lambda_chat.py knowledge_base.json routing_table.json build/
cd build && zip -r ../lambda.zip . && cd ..

aws lambda create-function \
  --function-name irh-ai-assistant \
  --runtime python3.12 \
  --handler lambda_chat.handler \
  --timeout 30 \
  --memory-size 256 \
  --zip-file fileb://lambda.zip \
  --role <ARN of an execution role with bedrock:InvokeModel + s3:GetObject/PutObject> \
  --environment "Variables={BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,BEDROCK_REGION=us-east-1,DATA_BUCKET=irh-ai-poc-<yourname>,KB_KEY=knowledge/knowledge_base.json,ROUTING_KEY=knowledge/routing_table.json}"
```

### Minimal IAM policy for the Lambda execution role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "bedrock:InvokeModel", "Resource": "*" },
    { "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"], "Resource": "arn:aws:s3:::irh-ai-poc-<yourname>/*" },
    { "Effect": "Allow", "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"], "Resource": "*" }
  ]
}
```

## 4. Expose a Function URL (no API Gateway, no VPC)
```bash
aws lambda create-function-url-config \
  --function-name irh-ai-assistant \
  --auth-type NONE \
  --cors '{"AllowOrigins":["*"],"AllowMethods":["POST","OPTIONS"],"AllowHeaders":["*"]}'
```
This returns a URL like `https://xxxx.lambda-url.us-east-1.on.aws/` — paste this into
the frontend's `.env` as `VITE_CHAT_API_URL`.

> POC note: `auth-type NONE` is fine for a 2–3 hour demo. Before any real rollout, put
> this behind API Gateway + a usage-plan API key or Cognito, and add basic rate limiting
> and abuse filtering — a public, unauthenticated LLM endpoint is not production-safe.

## 5. Editing the "approved knowledge"
Everything the assistant is allowed to say lives in `knowledge_base.json` and
`routing_table.json`. Edit those, re-upload to S3, and the next chat request picks up
the change (the Lambda caches per warm-container, so a fresh Lambda invocation or a
short wait picks up edits — fine for a POC).

## 6. Reading engagement insights (quick POC version)
```bash
aws s3 sync s3://irh-ai-poc-<yourname>/engagement ./engagement-data
# then just `cat`/`jq` the JSON files, or load them into a notebook / QuickSight later
```
Each file is one event: a message, a captured meeting request, or a team routing
decision — enough to build a simple "what are people asking about" dashboard later.
