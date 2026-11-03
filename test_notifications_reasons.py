from datetime import datetime
import hashlib
import hmac
import json
import os
import sqlite3
import pytest
from fastapi.testclient import TestClient

TEST_SECRET = "test_webhook_secret_key_123"
TEST_API_KEY = "test_events_api_key_456"
TEST_DB_PATH = "test_events.db"

os.environ["GITHUB_WEBHOOK_SECRET"] = TEST_SECRET
os.environ["EVENTS_API_KEY"] = TEST_API_KEY
os.environ["EVENTS_DB_PATH"] = TEST_DB_PATH

import webhook
from webhook import app, storage


@pytest.fixture(autouse=True)
def clean_database():
    storage.db_path = TEST_DB_PATH
    conn1 = sqlite3.connect(TEST_DB_PATH)
    try:
        conn1.execute("DROP TABLE IF EXISTS events")
        conn1.execute("DROP TABLE IF EXISTS notifications")
        conn1.execute("DROP TABLE IF EXISTS chat_log")
        conn1.commit()
    finally:
        conn1.close()

    webhook._sse_messages.clear()
    webhook._reason_rate_limits.clear()
    webhook._chat_rate_limits.clear()
    storage._init_db()

    yield

    conn2 = sqlite3.connect(TEST_DB_PATH)
    try:
        conn2.execute("DROP TABLE IF EXISTS events")
        conn2.execute("DROP TABLE IF EXISTS notifications")
        conn2.execute("DROP TABLE IF EXISTS chat_log")
        conn2.commit()
    finally:
        conn2.close()


@pytest.fixture
def client():
    return TestClient(app)


def sign_payload(payload_bytes: bytes, secret: str = TEST_SECRET) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


# ============================================================================
# 1. PUSH WITH 5 COMMITS -> 1 NOTIFICATION & 1 SSE MESSAGE
# ============================================================================

def test_signed_push_with_5_commits_creates_one_notification_and_one_sse(client):
    commits = [
        {"id": f"commit{i:04d}", "message": f"feat: implement component part {i}", "timestamp": "2024-05-20T10:00:00Z", "author": {"name": "Priya"}}
        for i in range(1, 6)
    ]
    payload = {
        "ref": "refs/heads/main",
        "repository": {"full_name": "smartbank-io/banking-core", "html_url": "https://github.com/smartbank-io/banking-core"},
        "pusher": {"name": "Priya"},
        "commits": commits,
    }
    raw_bytes = json.dumps(payload).encode("utf-8")
    sig = sign_payload(raw_bytes)

    res = client.post(
        "/webhook/github",
        content=raw_bytes,
        headers={
            "X-GitHub-Event": "push",
            "X-Hub-Signature-256": sig,
            "X-GitHub-Delivery": "del-push-5commits-unique-01",
            "Content-Type": "application/json",
        },
    )
    assert res.status_code == 200

    # Exactly 1 notification in database
    notifs = storage.get_notifications()
    assert len(notifs) == 1
    assert "Priya pushed 5 commits to main" in notifs[0]["title"]
    assert len(notifs[0]["event_ids"]) == 5

    # Exactly 1 SSE message broadcasted
    assert len(webhook._sse_messages) == 1
    assert webhook._sse_messages[0]["event"] == "notification"
    assert "Priya pushed 5 commits to main" in webhook._sse_messages[0]["data"]["title"]


# ============================================================================
# 2. WEAK COMMIT DETECTION SETS needs_reason
# ============================================================================

def test_weak_commit_message_sets_needs_reason(client):
    # Weak commit: "fix"
    weak_payload = {
        "ref": "refs/heads/main",
        "repository": {"full_name": "smartbank-io/banking-core"},
        "pusher": {"name": "Devin"},
        "commits": [{"id": "c_weak_001", "message": "fix", "timestamp": "2024-05-20T10:00:00Z"}],
    }
    raw_weak = json.dumps(weak_payload).encode("utf-8")
    res1 = client.post(
        "/webhook/github",
        content=raw_weak,
        headers={"X-GitHub-Event": "push", "X-Hub-Signature-256": sign_payload(raw_weak), "X-GitHub-Delivery": "del-weak-01", "Content-Type": "application/json"},
    )
    assert res1.status_code == 200
    notif_weak = storage.get_notifications()[0]
    assert notif_weak["needs_reason"] == 1

    # Strong commit: "feat(login): add demo access, closes #12"
    strong_payload = {
        "ref": "refs/heads/main",
        "repository": {"full_name": "smartbank-io/banking-core"},
        "pusher": {"name": "Devin"},
        "commits": [{"id": "c_strong_002", "message": "feat(login): add demo access, closes #12", "timestamp": "2024-05-20T11:00:00Z"}],
    }
    raw_strong = json.dumps(strong_payload).encode("utf-8")
    res2 = client.post(
        "/webhook/github",
        content=raw_strong,
        headers={"X-GitHub-Event": "push", "X-Hub-Signature-256": sign_payload(raw_strong), "X-GitHub-Delivery": "del-strong-02", "Content-Type": "application/json"},
    )
    assert res2.status_code == 200
    notifs = storage.get_notifications()
    notif_strong = [n for n in notifs if n["delivery_id"] == "del-strong-02"][0]
    assert notif_strong["needs_reason"] == 0


# ============================================================================
# 3. DELIVERY DEDUPLICATION
# ============================================================================

def test_same_delivery_sent_twice_creates_no_duplicate_notification(client):
    payload = {
        "ref": "refs/heads/main",
        "repository": {"full_name": "smartbank-io/banking-core"},
        "pusher": {"name": "Alex"},
        "commits": [{"id": "c_dup_001", "message": "feat(auth): initial commit", "timestamp": "2024-05-20T10:00:00Z"}],
    }
    raw_bytes = json.dumps(payload).encode("utf-8")
    sig = sign_payload(raw_bytes)
    headers = {
        "X-GitHub-Event": "push",
        "X-Hub-Signature-256": sig,
        "X-GitHub-Delivery": "del-identical-delivery-id-777",
        "Content-Type": "application/json",
    }

    # First delivery
    res1 = client.post("/webhook/github", content=raw_bytes, headers=headers)
    assert res1.status_code == 200
    assert len(storage.get_notifications()) == 1
    assert len(webhook._sse_messages) == 1

    # Second identical delivery
    res2 = client.post("/webhook/github", content=raw_bytes, headers=headers)
    assert res2.status_code == 200

    # Notification count and SSE message count remain strictly 1
    assert len(storage.get_notifications()) == 1
    assert len(webhook._sse_messages) == 1


# ============================================================================
# 4. POST REASON CAPTURE (APPEND-ONLY, AUTH, VALIDATION, INERT DATA)
# ============================================================================

def test_post_reason_validation_and_append_only(client):
    # Insert target event
    target_event = {
        "entity_name": "Biometric Auth",
        "event_type": "decision",
        "status": "proposed",
        "event_date": "2024-05-15",
        "ingested_at": "2024-05-15T09:00:00Z",
        "actors": ["Sarah Chen"],
        "quote": "Proposed biometric authentication architecture.",
        "evidence_url": "https://smartbank.atlassian.net/browse/BANK-102",
        "source_id": "gh-commit-target-bio-123",
    }
    storage.append(target_event)

    # 1. Rejects request without dashboard auth (401)
    res_no_auth = client.post(
        f"/api/events/{target_event['source_id']}/reason",
        json={"reason": "Valid reason explanation for this change."},
    )
    assert res_no_auth.status_code == 401

    # 2. Rejects text under 10 characters (400)
    res_too_short = client.post(
        f"/api/events/{target_event['source_id']}/reason",
        json={"reason": "short"},
        headers={"X-API-Key": TEST_API_KEY},
    )
    assert res_too_short.status_code == 400

    # 3. Rejects text over 500 characters (400)
    res_too_long = client.post(
        f"/api/events/{target_event['source_id']}/reason",
        json={"reason": "a" * 501},
        headers={"X-API-Key": TEST_API_KEY},
    )
    assert res_too_long.status_code == 400

    # 4. Stores <script> tag as inert plain text
    inert_reason = "<script>alert('injection')</script> approved per architectural board review"
    res_valid = client.post(
        f"/api/events/{target_event['source_id']}/reason",
        json={"reason": inert_reason},
        headers={"X-API-Key": TEST_API_KEY, "X-User-Name": "Marcus Vance"},
    )
    assert res_valid.status_code == 200
    note_event = res_valid.json()

    # Original row in database remains strictly unchanged
    orig_row = storage.get_event_by_source_id(target_event["source_id"])
    assert orig_row["status"] == "proposed"
    assert orig_row["quote"] == "Proposed biometric authentication architecture."
    assert orig_row["actors"] == ["Sarah Chen"]

    # New event inserted with note- prefix and linked via related_source_id
    assert note_event["source_id"].startswith("note-")
    assert note_event["related_source_id"] == target_event["source_id"]
    assert note_event["quote"] == inert_reason
    assert "added by Marcus Vance" in note_event["actors"][0]
    # Reason contains 'approved' -> status set to approved
    assert note_event["status"] == "approved"
    assert note_event["event_type"] == "decided"


# ============================================================================
# 5. READ AND READ-ALL ENDPOINTS & UNREAD COUNT
# ============================================================================

def test_read_and_read_all_notification_endpoints(client):
    notif1 = {
        "id": "notif-01",
        "kind": "push",
        "repo": "smartbank-io/banking-core",
        "title": "Priya pushed 1 commit to main",
        "body": "commit 1",
        "actor": "Priya",
        "event_ids": ["gh-c1"],
        "needs_reason": 0,
        "created_at": "2024-05-20T10:00:00Z",
        "read_at": None,
    }
    notif2 = {
        "id": "notif-02",
        "kind": "push",
        "repo": "smartbank-io/banking-core",
        "title": "Alex pushed 1 commit to main",
        "body": "commit 2",
        "actor": "Alex",
        "event_ids": ["gh-c2"],
        "needs_reason": 1,
        "created_at": "2024-05-20T11:00:00Z",
        "read_at": None,
    }
    storage.add_notification(notif1)
    storage.add_notification(notif2)

    # Initial unread count = 2
    res_unread = client.get("/api/notifications?unread=1", headers={"X-API-Key": TEST_API_KEY})
    assert res_unread.status_code == 200
    assert len(res_unread.json()) == 2

    # Mark notif1 read
    res_read1 = client.post("/api/notifications/notif-01/read", headers={"X-API-Key": TEST_API_KEY})
    assert res_read1.status_code == 200
    assert res_read1.json()["read_at"] is not None

    # Unread count = 1
    res_unread2 = client.get("/api/notifications?unread=1", headers={"X-API-Key": TEST_API_KEY})
    assert len(res_unread2.json()) == 1
    assert res_unread2.json()[0]["id"] == "notif-02"

    # Mark all read
    res_read_all = client.post("/api/notifications/read-all", headers={"X-API-Key": TEST_API_KEY})
    assert res_read_all.status_code == 200
    res_unread_final = client.get("/api/notifications?unread=1", headers={"X-API-Key": TEST_API_KEY})
    assert len(res_unread_final.json()) == 0


# ============================================================================
# 6. CHAT INTEGRATION: "WHY WAS ... CHANGED" CITES REASON NOTE
# ============================================================================

def test_chat_why_was_changed_cites_reason_note(client):
    # Commit with reason note
    commit_ev = {
        "entity_name": "OTP Verification TTL",
        "event_type": "commit",
        "status": "implemented",
        "event_date": "2024-05-22",
        "ingested_at": "2024-05-22T08:00:00Z",
        "actors": ["Devin K"],
        "quote": "Reduced OTP validity window to 120s.",
        "evidence_url": "https://github.com/smartbank-io/banking-core/commit/c001",
        "source_id": "gh-commit-otp-ttl-101",
    }
    storage.append(commit_ev)

    # Attach reason note
    client.post(
        f"/api/events/{commit_ev['source_id']}/reason",
        json={"reason": "Security audit requirement per PCI-DSS Section 8.3 compliance."},
        headers={"X-API-Key": TEST_API_KEY, "X-User-Name": "Marcus Vance"},
    )

    # Ask chat "Why was OTP Verification TTL changed?"
    res_chat = client.post("/api/chat", json={"message": "Why was OTP Verification TTL changed?"})
    assert res_chat.status_code == 200
    data = res_chat.json()
    assert data["intent"] == "product_question"
    assert "PCI-DSS Section 8.3 compliance" in data["reply"]
    assert "added by Marcus Vance" in data["reply"]

    # Must cite the reason note source_id
    citation_source_ids = [c["source_id"] for c in data["citations"]]
    assert any(s.startswith("note-") for s in citation_source_ids)
    assert commit_ev["source_id"] in citation_source_ids

    # Query commit with no reason
    commit_no_reason = {
        "entity_name": "Quick Checkout Banner",
        "event_type": "commit",
        "status": "implemented",
        "event_date": "2024-05-23",
        "ingested_at": "2024-05-23T08:00:00Z",
        "actors": ["Rachel Wei"],
        "quote": "update banner text",
        "evidence_url": "https://github.com/smartbank-io/banking-core/commit/c002",
        "source_id": "gh-commit-banner-202",
    }
    storage.append(commit_no_reason)

    res_no_reason = client.post("/api/chat", json={"message": "Why was Quick Checkout Banner changed?"})
    assert res_no_reason.status_code == 200
    data_no_reason = res_no_reason.json()
    assert "No reason has been recorded for this change." in data_no_reason["reply"]
    assert any(c["source_id"] == commit_no_reason["source_id"] for c in data_no_reason["citations"])


# ============================================================================
# 7. SECURITY: NO SECRETS IN RESPONSES & SIGNATURE VERIFICATION
# ============================================================================

def test_responses_never_contain_secrets_and_invalid_signature_fails(client):
    # Invalid signature -> 401
    bad_res = client.post(
        "/webhook/github",
        content=b'{"test": 1}',
        headers={"X-GitHub-Event": "push", "X-Hub-Signature-256": "sha256=invalid", "Content-Type": "application/json"},
    )
    assert bad_res.status_code == 401

    # Valid webhook response contains no secret keys
    valid_bytes = json.dumps({"zen": "Safety first."}).encode("utf-8")
    ok_res = client.post(
        "/webhook/github",
        content=valid_bytes,
        headers={"X-GitHub-Event": "ping", "X-Hub-Signature-256": sign_payload(valid_bytes), "Content-Type": "application/json"},
    )
    assert ok_res.status_code == 200
    text_resp = json.dumps(ok_res.json())
    assert TEST_SECRET not in text_resp
    assert TEST_API_KEY not in text_resp

