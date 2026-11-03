from datetime import datetime
import hashlib
import hmac
import json
import os
import sqlite3
import pytest
from fastapi.testclient import TestClient

# Set test environment secrets before importing webhook
TEST_SECRET = "test_webhook_secret_key_123"
TEST_API_KEY = "test_events_api_key_456"
TEST_DB_PATH = "test_events.db"

os.environ["GITHUB_WEBHOOK_SECRET"] = TEST_SECRET
os.environ["EVENTS_API_KEY"] = TEST_API_KEY
os.environ["EVENTS_DB_PATH"] = TEST_DB_PATH

from webhook import app, storage, GitHubEventStorage


@pytest.fixture(autouse=True)
def clean_database():
    """Ensure a clean test database table before each test."""
    storage.db_path = TEST_DB_PATH
    conn1 = sqlite3.connect(TEST_DB_PATH)
    try:
        conn1.execute("DROP TABLE IF EXISTS events")
        conn1.execute("DROP TABLE IF EXISTS notifications")
        conn1.commit()
    finally:
        conn1.close()

    import webhook
    webhook._sse_messages.clear()
    webhook._reason_rate_limits.clear()
    storage._init_db()

    yield

    conn2 = sqlite3.connect(TEST_DB_PATH)
    try:
        conn2.execute("DROP TABLE IF EXISTS events")
        conn2.execute("DROP TABLE IF EXISTS notifications")
        conn2.commit()
    finally:
        conn2.close()


@pytest.fixture
def client():
    return TestClient(app)


def sign_payload(payload_bytes: bytes, secret: str = TEST_SECRET) -> str:
    """Generate valid X-Hub-Signature-256 signature."""
    digest = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


# ============================================================================
# 1. SIGNATURE VERIFICATION TESTS
# ============================================================================

def test_missing_signature_rejected(client):
    payload = json.dumps({"zen": "Hello"}).encode("utf-8")
    response = client.post(
        "/webhook/github",
        content=payload,
        headers={"X-GitHub-Event": "ping", "Content-Type": "application/json"},
    )
    assert response.status_code == 401
    assert "signature" in response.json()["detail"].lower()


def test_invalid_signature_rejected(client):
    payload = json.dumps({"zen": "Hello"}).encode("utf-8")
    response = client.post(
        "/webhook/github",
        content=payload,
        headers={
            "X-GitHub-Event": "ping",
            "X-Hub-Signature-256": "sha256=0000000000000000000000000000000000000000000000000000000000000000",
            "Content-Type": "application/json",
        },
    )
    assert response.status_code == 401
    assert "signature" in response.json()["detail"].lower()


# ============================================================================
# 2. PING EVENT & INGESTED_AT CHECK
# ============================================================================

def test_ping_event_and_ingested_at(client):
    payload_dict = {
        "zen": "Approachable is better than simple.",
        "hook_id": 987654,
        "repository": {
            "full_name": "smartbank-io/banking-core",
            "html_url": "https://github.com/smartbank-io/banking-core",
            "created_at": "2024-01-01T00:00:00Z",
        },
        "sender": {"login": "octocat"},
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = sign_payload(payload_bytes)

    res = client.post(
        "/webhook/github",
        content=payload_bytes,
        headers={"X-GitHub-Event": "ping", "X-Hub-Signature-256": sig, "Content-Type": "application/json"},
    )

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "stored"
    event = data["event"]
    assert event["event_type"] == "ping"
    assert event["entity_name"] == "smartbank-io/banking-core"
    assert event["source_id"] == "gh-ping-987654"

    # Verify ingested_at is a valid ISO UTC timestamp
    assert "ingested_at" in event
    dt = datetime.fromisoformat(event["ingested_at"])
    assert dt is not None


# ============================================================================
# 3. GET /webhook/github/events API KEY AUTHENTICATION
# ============================================================================

def test_events_endpoint_requires_api_key(client):
    # Missing header -> 401
    res1 = client.get("/webhook/github/events")
    assert res1.status_code == 401

    # Wrong API key -> 401
    res2 = client.get("/webhook/github/events", headers={"X-API-Key": "wrong-key"})
    assert res2.status_code == 401

    # Correct API key -> 200
    res3 = client.get("/webhook/github/events", headers={"X-API-Key": TEST_API_KEY})
    assert res3.status_code == 200
    assert "events" in res3.json()


# ============================================================================
# 4. ISSUES TESTS (opened, title renamed with old/new, closed with closed_at)
# ============================================================================

def test_issue_opened(client):
    payload_dict = {
        "action": "opened",
        "issue": {
            "id": 1001,
            "number": 42,
            "title": "Implement biometric passkey login",
            "body": "We need to support FIDO2 WebAuthn passkeys across mobile and web.",
            "html_url": "https://github.com/smartbank-io/banking-core/issues/42",
            "created_at": "2026-10-30T10:15:30Z",
            "user": {"login": "sarah-connor"},
        },
        "sender": {"login": "sarah-connor"},
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = sign_payload(payload_bytes)

    res = client.post(
        "/webhook/github",
        content=payload_bytes,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sig, "Content-Type": "application/json"},
    )

    assert res.status_code == 200
    event = res.json()["event"]
    assert event["entity_name"] == "Implement biometric passkey login"
    assert event["event_type"] == "issues"
    assert event["status"] == "opened"
    assert event["event_date"] == "2026-10-30T10:15:30Z"
    assert event["source_id"] == "gh-issue-42-opened"
    assert "ingested_at" in event


def test_issue_edited_with_title_change_outputs_renamed(client):
    payload_dict = {
        "action": "edited",
        "issue": {
            "id": 1002,
            "number": 43,
            "title": "ContextEngine: Temporal Product Knowledge",
            "body": "Updated specification for temporal knowledge.",
            "html_url": "https://github.com/smartbank-io/banking-core/issues/43",
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-30T12:00:00Z",
            "user": {"login": "alex-morgan"},
        },
        "changes": {
            "title": {"from": "SmartSearch Engine"}
        },
        "sender": {"login": "alex-morgan"},
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = sign_payload(payload_bytes)

    res = client.post(
        "/webhook/github",
        content=payload_bytes,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sig, "Content-Type": "application/json"},
    )

    assert res.status_code == 200
    event = res.json()["event"]
    assert event["event_type"] == "renamed"
    assert event["old_name"] == "SmartSearch Engine"
    assert event["new_name"] == "ContextEngine: Temporal Product Knowledge"
    # Source id includes updated_at and short hash of new title
    title_hash = hashlib.sha256("ContextEngine: Temporal Product Knowledge".encode("utf-8")).hexdigest()[:8]
    assert event["source_id"] == f"gh-issue-43-edited-2026-10-30T12:00:00Z-{title_hash}"


# ============================================================================
# 5. PULL REQUEST TESTS (opened, merged with closed_at in source_id)
# ============================================================================

def test_pull_request_opened_and_merged(client):
    # Opened
    pr_open_dict = {
        "action": "opened",
        "pull_request": {
            "id": 2001,
            "number": 105,
            "title": "feat(auth): Add WebAuthn Passkey Registration Endpoint",
            "body": "Registers passkey public keys in Firestore datastore.",
            "html_url": "https://github.com/smartbank-io/banking-core/pull/105",
            "created_at": "2026-10-30T11:00:00Z",
            "user": {"login": "marcus-vance"},
        },
        "sender": {"login": "marcus-vance"},
    }
    open_bytes = json.dumps(pr_open_dict).encode("utf-8")
    res1 = client.post(
        "/webhook/github",
        content=open_bytes,
        headers={"X-GitHub-Event": "pull_request", "X-Hub-Signature-256": sign_payload(open_bytes), "Content-Type": "application/json"},
    )
    assert res1.status_code == 200
    assert res1.json()["event"]["source_id"] == "gh-pr-105-opened"

    # Merged (closed_at included in source_id)
    pr_merge_dict = {
        "action": "closed",
        "pull_request": {
            "id": 2001,
            "number": 105,
            "title": "feat(auth): Add WebAuthn Passkey Registration Endpoint",
            "body": "Registers passkey public keys in Firestore datastore.",
            "merged": True,
            "merged_at": "2026-10-30T14:30:00Z",
            "closed_at": "2026-10-30T14:30:00Z",
            "html_url": "https://github.com/smartbank-io/banking-core/pull/105",
            "merged_by": {"login": "elena-rostova"},
            "user": {"login": "marcus-vance"},
        },
        "sender": {"login": "elena-rostova"},
    }
    merge_bytes = json.dumps(pr_merge_dict).encode("utf-8")
    res2 = client.post(
        "/webhook/github",
        content=merge_bytes,
        headers={"X-GitHub-Event": "pull_request", "X-Hub-Signature-256": sign_payload(merge_bytes), "Content-Type": "application/json"},
    )
    assert res2.status_code == 200
    assert res2.json()["event"]["source_id"] == "gh-pr-105-merged-2026-10-30T14:30:00Z"


# ============================================================================
# 6. ISSUE COMMENT TEST
# ============================================================================

def test_issue_comment_created(client):
    payload_dict = {
        "action": "created",
        "issue": {
            "id": 1004,
            "number": 45,
            "title": "Architecture RFC: Payment Settlement Microservice",
        },
        "comment": {
            "id": 5001,
            "body": "Architecture Review Board approves gRPC protocol.",
            "created_at": "2026-10-30T16:00:00Z",
            "html_url": "https://github.com/smartbank-io/banking-core/issues/45#issuecomment-5001",
            "user": {"login": "marcus-vance"},
        },
        "sender": {"login": "marcus-vance"},
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = sign_payload(payload_bytes)

    res = client.post(
        "/webhook/github",
        content=payload_bytes,
        headers={"X-GitHub-Event": "issue_comment", "X-Hub-Signature-256": sig, "Content-Type": "application/json"},
    )

    assert res.status_code == 200
    assert res.json()["event"]["source_id"] == "gh-comment-5001"


# ============================================================================
# 7. NEW REQUIRED TESTS (Requirement 4)
# ============================================================================

def test_events_survive_creating_new_storage_object_on_same_db_file(client):
    """Events must survive creating a new storage object on the same SQLite db file."""
    payload_dict = {
        "action": "opened",
        "issue": {
            "id": 888,
            "number": 70,
            "title": "Database Persistence Test",
            "body": "Must persist across storage instances",
            "html_url": "https://github.com/smartbank-io/banking-core/issues/70",
            "created_at": "2026-10-30T09:00:00Z",
            "user": {"login": "tester"},
        },
        "sender": {"login": "tester"},
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = sign_payload(payload_bytes)

    # Ingest event through FastAPI endpoint
    res = client.post(
        "/webhook/github",
        content=payload_bytes,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sig, "Content-Type": "application/json"},
    )
    assert res.status_code == 200

    # Instantiate a brand new storage object pointing to the same db file
    new_storage_instance = GitHubEventStorage(db_path=TEST_DB_PATH)
    all_events = new_storage_instance.get_all()

    assert len(all_events) == 1
    assert all_events[0]["entity_name"] == "Database Persistence Test"
    assert all_events[0]["source_id"] == "gh-issue-70-opened"
    assert new_storage_instance.exists("gh-issue-70-opened") is True


def test_close_reopen_close_stores_two_closed_events(client):
    """Closing an issue, reopening it, and closing it again at a new closed_at must store both close events."""
    # First Close
    close1_dict = {
        "action": "closed",
        "issue": {
            "id": 999,
            "number": 75,
            "title": "Intermittent Auth Bug",
            "state_reason": "completed",
            "closed_at": "2026-10-30T10:00:00Z",
            "html_url": "https://github.com/smartbank-io/banking-core/issues/75",
        },
        "sender": {"login": "engineer-1"},
    }
    bytes1 = json.dumps(close1_dict).encode("utf-8")
    res1 = client.post(
        "/webhook/github",
        content=bytes1,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sign_payload(bytes1), "Content-Type": "application/json"},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "stored"
    assert res1.json()["event"]["source_id"] == "gh-issue-75-closed-2026-10-30T10:00:00Z"

    # Second Close (after reopening, with a new closed_at timestamp)
    close2_dict = {
        "action": "closed",
        "issue": {
            "id": 999,
            "number": 75,
            "title": "Intermittent Auth Bug",
            "state_reason": "completed",
            "closed_at": "2026-10-30T16:30:00Z",
            "html_url": "https://github.com/smartbank-io/banking-core/issues/75",
        },
        "sender": {"login": "engineer-2"},
    }
    bytes2 = json.dumps(close2_dict).encode("utf-8")
    res2 = client.post(
        "/webhook/github",
        content=bytes2,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sign_payload(bytes2), "Content-Type": "application/json"},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "stored"
    assert res2.json()["event"]["source_id"] == "gh-issue-75-closed-2026-10-30T16:30:00Z"

    # Verify both close events are stored in SQLite
    events_res = client.get("/webhook/github/events", headers={"X-API-Key": TEST_API_KEY})
    events = events_res.json()["events"]
    assert len(events) == 2
    assert events[0]["source_id"] == "gh-issue-75-closed-2026-10-30T10:00:00Z"
    assert events[1]["source_id"] == "gh-issue-75-closed-2026-10-30T16:30:00Z"


def test_two_edits_in_same_second_both_stored(client):
    """Two edits occurring in the same second (same updated_at) with different titles must both be stored."""
    same_second_timestamp = "2026-10-30T12:00:00Z"

    # Edit 1 in that second
    edit1_dict = {
        "action": "edited",
        "issue": {
            "id": 333,
            "number": 50,
            "title": "Payment Settlement v2 - Draft",
            "updated_at": same_second_timestamp,
            "html_url": "https://github.com/smartbank-io/banking-core/issues/50",
            "user": {"login": "author"},
        },
        "changes": {
            "title": {"from": "Payment Settlement v1"}
        },
        "sender": {"login": "editor-1"},
    }
    bytes1 = json.dumps(edit1_dict).encode("utf-8")
    res1 = client.post(
        "/webhook/github",
        content=bytes1,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sign_payload(bytes1), "Content-Type": "application/json"},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "stored"
    hash1 = hashlib.sha256("Payment Settlement v2 - Draft".encode("utf-8")).hexdigest()[:8]
    assert res1.json()["event"]["source_id"] == f"gh-issue-50-edited-{same_second_timestamp}-{hash1}"

    # Edit 2 in the EXACT same second (different title)
    edit2_dict = {
        "action": "edited",
        "issue": {
            "id": 333,
            "number": 50,
            "title": "Payment Settlement v2 - Final Approved",
            "updated_at": same_second_timestamp,
            "html_url": "https://github.com/smartbank-io/banking-core/issues/50",
            "user": {"login": "author"},
        },
        "changes": {
            "title": {"from": "Payment Settlement v2 - Draft"}
        },
        "sender": {"login": "editor-2"},
    }
    bytes2 = json.dumps(edit2_dict).encode("utf-8")
    res2 = client.post(
        "/webhook/github",
        content=bytes2,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sign_payload(bytes2), "Content-Type": "application/json"},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "stored"
    hash2 = hashlib.sha256("Payment Settlement v2 - Final Approved".encode("utf-8")).hexdigest()[:8]
    assert res2.json()["event"]["source_id"] == f"gh-issue-50-edited-{same_second_timestamp}-{hash2}"

    # Verify both edits are stored
    events_res = client.get("/webhook/github/events", headers={"X-API-Key": TEST_API_KEY})
    events = events_res.json()["events"]
    assert len(events) == 2
    assert events[0]["source_id"] == f"gh-issue-50-edited-{same_second_timestamp}-{hash1}"
    assert events[1]["source_id"] == f"gh-issue-50-edited-{same_second_timestamp}-{hash2}"


def test_same_payload_sent_twice_is_stored_once(client):
    """The exact same payload sent twice must be stored once and skipped on second receipt."""
    payload_dict = {
        "action": "opened",
        "issue": {
            "id": 777,
            "number": 99,
            "title": "Idempotent Webhook Delivery Test",
            "body": "Testing deduplication",
            "html_url": "https://github.com/smartbank-io/banking-core/issues/99",
            "created_at": "2026-10-30T18:00:00Z",
            "user": {"login": "qa-engineer"},
        },
        "sender": {"login": "qa-engineer"},
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = sign_payload(payload_bytes)

    # First delivery -> stored
    res1 = client.post(
        "/webhook/github",
        content=payload_bytes,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sig, "Content-Type": "application/json"},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "stored"

    # Second delivery (same payload) -> skipped
    res2 = client.post(
        "/webhook/github",
        content=payload_bytes,
        headers={"X-GitHub-Event": "issues", "X-Hub-Signature-256": sig, "Content-Type": "application/json"},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "skipped"
    assert res2.json()["reason"] == "duplicate_source_id"
    assert res2.json()["source_id"] == "gh-issue-99-opened"

    # Verify storage count in SQLite is strictly 1
    events_res = client.get("/webhook/github/events", headers={"X-API-Key": TEST_API_KEY})
    assert events_res.json()["count"] == 1
    assert events_res.json()["events"][0]["source_id"] == "gh-issue-99-opened"
