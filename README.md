# IRH AI Assistant — "The Business Card That Talks Back" (POC)

A minimal, deployable proof of concept: scan a QR code on an IRH business card
(or click a link in an email signature) → land on a chat page → ask IRH-approved
questions, get routed to the right commodity/function team, or request a meeting
with the CEO — all logged for engagement insights.

## Architecture (no VPC, kept deliberately simple)

```
 Business card (front/back)         Email signature
        │  QR code                        │ link
        ▼                                  ▼
        React app on AWS Amplify Hosting (static, global CDN)
                        │
                        │  POST /chat  (fetch)
                        ▼
        AWS Lambda (Python) behind a Lambda Function URL
                        │
          ┌─────────────┼───────────────────┐
          ▼                                  ▼
   Amazon Bedrock                     Amazon S3
   (Anthropic Claude)      knowledge/  → approved IRH info + routing table
   generates the reply      engagement/ → every chat turn, meeting request,
                                          and team-routing event (for insights)
```

- **No VPC, no API Gateway, no database** — Amplify Hosting + a single Lambda
  Function URL + one S3 bucket is enough for a 2–3 hour POC and removes most of
  the setup overhead.
- **"Approved information only"** is enforced by keeping all facts in
  `backend/knowledge_base.json` / `routing_table.json` (editable independent of
  code) and instructing the model, in the system prompt, to only answer from
  that data.
- **Meeting requests** and **team routing** are captured by having the model
  emit a small structured tag (`<meeting_request>{...}</meeting_request>`) once
  it has gathered the needed fields; the Lambda parses it, saves it to S3, and
  strips it before showing the reply to the user.
- **Engagement insights** for the POC = the JSON files landing in
  `s3://.../engagement/` — enough to demo "what are people asking about" without
  building a full analytics stack.

## Repo layout
```
frontend/   React + Vite app → deploy to AWS Amplify Hosting
backend/    Python Lambda + knowledge base + routing table → deploy notes in backend/DEPLOY.md
```

## Suggested 2–3 hour build order

1. **(15 min) Bedrock access** — enable a Claude model in Bedrock model access.
2. **(20 min) S3 + knowledge base** — create the bucket, edit
   `knowledge_base.json` / `routing_table.json` with real (or placeholder) IRH
   facts and team contacts, upload to S3.
3. **(30 min) Backend** — zip and deploy `lambda_chat.py`, attach the IAM policy
   in `backend/DEPLOY.md`, create the Function URL. Test with `curl`.
4. **(45 min) Frontend** — `cd frontend && npm install`, set
   `VITE_CHAT_API_URL` in `.env` to the Function URL, `npm run dev` to test
   locally against the real backend.
5. **(20 min) Amplify Hosting** — connect the repo (or `amplify publish` /
   drag-and-drop the `dist` folder) so the app has a public URL.
6. **(15 min) QR codes / card mockups** — open `/#/mockups` in the deployed app
   to see the front/back card and email signature reference designs; generate
   real QR codes pointing at `<amplify-url>/#/card-front`,
   `<amplify-url>/#/card-back`, and `<amplify-url>/#/signature` (already wired
   up via `qrcode.react` in the mockup page — just update `BASE_URL`).
7. **(remaining time) Polish + demo script** — walk through: scan → ask a
   commodity question → ask "how do I meet Vineet" → watch the meeting request
   land in S3 → check the engagement log.

## What's intentionally out of scope for the POC
- Authentication / rate limiting on the public endpoint (see the note in
  `backend/DEPLOY.md` — required before any real rollout)
- Real email delivery to Refilwe / team inboxes (POC stores the request in S3;
  wiring SES or a Slack webhook is a small follow-on step)
- A vector database / RAG pipeline — the knowledge base is small enough to pass
  in full as context, which keeps the POC simple and fast to edit
- Analytics dashboard — the raw engagement JSON in S3 is the POC's "insights" layer
