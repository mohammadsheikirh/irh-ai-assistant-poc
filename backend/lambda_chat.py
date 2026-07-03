"""
IRH AI Assistant - Chat Lambda (POC)
-------------------------------------
Single Lambda behind a Function URL (no VPC, no API Gateway needed for the POC).

Responsibilities:
1. Receive a chat turn from the React frontend.
2. Build a system prompt from the approved knowledge base + team routing table (S3 or bundled JSON).
3. Call Amazon Bedrock (Anthropic Claude) to generate a reply.
4. Detect when the model has finished collecting a meeting request (it emits a
   <meeting_request>{...}</meeting_request> block) and, if so, store the
   structured request in S3 and strip the tag from the visible reply.
5. Log every turn to S3 as an "engagement event" for later analytics
   (topics asked about, meeting requests, supplier enquiries, etc).

Environment variables expected:
  BEDROCK_MODEL_ID   e.g. "anthropic.claude-3-5-sonnet-20241022-v2:0"
  BEDROCK_REGION     e.g. "us-east-1" (must be a region where the model is enabled)
  DATA_BUCKET        S3 bucket used for knowledge base + logs + meeting requests
  KB_KEY             e.g. "knowledge/knowledge_base.json"
  ROUTING_KEY        e.g. "knowledge/routing_table.json"
"""

import json
import os
import re
import uuid
import datetime
import boto3

REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")
BUCKET = os.environ.get("DATA_BUCKET")
KB_KEY = os.environ.get("KB_KEY", "knowledge/knowledge_base.json")
ROUTING_KEY = os.environ.get("ROUTING_KEY", "knowledge/routing_table.json")

bedrock = boto3.client("bedrock-runtime", region_name=REGION)
s3 = boto3.client("s3")

CORS_HEADERS = {}

_kb_cache = None
_routing_cache = None


def _load_json_from_s3(key, fallback):
    global _kb_cache, _routing_cache
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=key)
        return json.loads(obj["Body"].read())
    except Exception:
        # Fall back to bundled copy so the POC still works before the
        # knowledge base has been uploaded to S3.
        return fallback


def get_knowledge_base():
    global _kb_cache
    if _kb_cache is None:
        with open(os.path.join(os.path.dirname(__file__), "knowledge_base.json")) as f:
            fallback = json.load(f)
        _kb_cache = _load_json_from_s3(KB_KEY, fallback)
    return _kb_cache


def get_routing_table():
    global _routing_cache
    if _routing_cache is None:
        with open(os.path.join(os.path.dirname(__file__), "routing_table.json")) as f:
            fallback = json.load(f)
        _routing_cache = _load_json_from_s3(ROUTING_KEY, fallback)
    return _routing_cache


def build_system_prompt():
    kb = get_knowledge_base()
    routing = get_routing_table()

    return f"""You are the IRH AI Assistant, reached by scanning the QR code on an IRH
business card or email signature. You speak on behalf of IRH to clients, investors,
suppliers, and partners.

RULES:
- Only answer using the APPROVED IRH INFORMATION below. Never invent facts, figures,
  deal terms, or commitments that are not in this data.
- If asked something outside this information, say you don't have that detail approved
  for sharing yet and offer to connect them to the right person.
- Be concise, professional, and helpful. This is a first touchpoint, not a sales pitch.
- Your reply is rendered as plain text in a chat bubble, not Markdown. Do not use **asterisks**, #headers, or markdown bullet symbols (*, -). Write in plain sentences and use line breaks or simple numbered lists ("1.", "2.") instead.

MEETING REQUESTS WITH VINEET MEHRA (CEO):
If someone asks to meet, speak with, or get time with Vineet Mehra, collect these fields
one or two at a time (don't interrogate all at once): requester_name, company, purpose,
topic, preferred_location, preferred_dates, contact_email.
Once you have all fields, respond to the user with a short confirmation sentence AND
append, on its own line, a machine-readable block exactly in this form (no markdown,
no extra text inside it):
<meeting_request>{{"requester_name": "...", "company": "...", "purpose": "...", "topic": "...", "preferred_location": "...", "preferred_dates": "...", "contact_email": "..."}}</meeting_request>
Tell the user their request has been sent to {routing['ceo_meeting_route']['gatekeeper_name']}
({routing['ceo_meeting_route']['gatekeeper_role']}) who will confirm scheduling.

ROUTING TO SPECIALIST TEAMS:
When someone asks about a specific commodity or function (e.g. LNG, Copper, Crude & Products,
Iron Ore, Uranium, Lithium, Trade Finance, Shipping/Freight, Agri and Soft Products,
Risk Management, M&A, Origination & Structuring), tell them which team handles it and
share the routing email from the table below. Use this same JSON tag pattern so the
frontend can also log it as a routed enquiry:
<team_route>{{"topic": "...", "email": "..."}}</team_route>

SUPPLIER / PARTNER ENQUIRIES:
Route these to: {routing['supplier_partner_route']['email']}

APPROVED IRH INFORMATION:
{json.dumps(kb, indent=2)}

TEAM ROUTING TABLE:
{json.dumps(routing['teams'], indent=2)}
"""


def call_bedrock(system_prompt, history):
    """history: list of {role: 'user'|'assistant', content: str}"""
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 700,
        "system": system_prompt,
        "messages": history,
    }
    resp = bedrock.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(resp["body"].read())
    text_blocks = [b["text"] for b in payload.get("content", []) if b.get("type") == "text"]
    return "".join(text_blocks)


def extract_and_strip(tag, text):
    match = re.search(rf"<{tag}>(.*?)</{tag}>", text, re.DOTALL)
    data = None
    if match:
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            data = None
        text = (text[: match.start()] + text[match.end():]).strip()
    return text, data


def log_event(event_type, session_id, data):
    if not BUCKET:
        return
    ts = datetime.datetime.utcnow()
    key = f"engagement/{ts:%Y/%m/%d}/{event_type}-{session_id}-{uuid.uuid4().hex[:8]}.json"
    record = {"type": event_type, "session_id": session_id, "timestamp": ts.isoformat(), **data}
    try:
        s3.put_object(Bucket=BUCKET, Key=key, Body=json.dumps(record).encode("utf-8"))
    except Exception as e:
        print(f"log_event failed: {e}")


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        session_id = body.get("sessionId") or str(uuid.uuid4())
        message = body.get("message", "")
        history = body.get("history", [])  # prior turns from the client
        source = body.get("source", "unknown")  # "card_front" | "card_back" | "email_signature"

        history = history + [{"role": "user", "content": message}]
        system_prompt = build_system_prompt()
        raw_reply = call_bedrock(system_prompt, history)

        reply, meeting_data = extract_and_strip("meeting_request", raw_reply)
        reply, team_route_data = extract_and_strip("team_route", reply)

        log_event("message", session_id, {"source": source, "user_message": message})

        if meeting_data:
            meeting_data["session_id"] = session_id
            meeting_data["source"] = source
            log_event("meeting_request", session_id, meeting_data)

        if team_route_data:
            log_event("team_route", session_id, {**team_route_data, "source": source})

        return {
            "statusCode": 200,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({
                "sessionId": session_id,
                "reply": reply,
                "meetingCaptured": bool(meeting_data),
                "teamRouted": team_route_data,
            }),
        }
    except Exception as e:
        print(f"handler error: {e}")
        return {
            "statusCode": 500,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)}),
        }
