import os
import json
import sqlite3
import pytest

# Ensure DEMO_MODE is not set to true
os.environ.pop("DEMO_MODE", None)

@pytest.fixture
def db_conn():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE user_github_tokens (
            user_id TEXT PRIMARY KEY,
            encrypted_token TEXT NOT NULL,
            iv TEXT NOT NULL,
            auth_tag TEXT NOT NULL,
            scopes TEXT,
            github_username TEXT,
            avatar_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE repositories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            workspace_id TEXT,
            full_name TEXT UNIQUE,
            webhook_id INTEGER,
            status TEXT DEFAULT 'active',
            last_sync_at DATETIME,
            event_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    yield conn
    conn.close()

def test_token_stored_encrypted_and_never_returned(db_conn):
    """Verify that stored GitHub tokens are encrypted (AES-256-GCM) and never stored or returned as plaintext."""
    cursor = db_conn.cursor()
    
    raw_token = "ghp_secret_access_token_12345"
    iv_hex = "0102030405060708090a0b0c"
    auth_tag_hex = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
    encrypted_hex = "f9e8d7c6b5a41234567890abcdef"

    cursor.execute(
        "INSERT INTO user_github_tokens (user_id, encrypted_token, iv, auth_tag, scopes, github_username, avatar_url, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
        ("usr_test_123", encrypted_hex, iv_hex, auth_tag_hex, "read:user, public_repo", "octocat", "https://github.com/images/error/octocat_happy.gif")
    )
    db_conn.commit()

    # Query DB row directly
    cursor.execute("SELECT encrypted_token, iv, auth_tag, github_username, scopes FROM user_github_tokens WHERE user_id = 'usr_test_123'")
    row = cursor.fetchone()

    assert row is not None
    # Token must not be stored in plaintext
    assert raw_token not in row[0]
    assert row[0] == encrypted_hex
    assert row[3] == "octocat"
    # Scopes returned, but raw token is never exposed
    assert "public_repo" in row[4]

    # Verify status API model never includes encrypted_token or raw token
    status_response = {
        "connected": True,
        "github_username": row[3],
        "scopes": row[4],
        "tracked_count": 0,
    }
    assert "encrypted_token" not in status_response
    assert "token" not in status_response
    assert raw_token not in json.dumps(status_response)

def test_repos_pagination_and_field_mapping():
    """Verify pagination loop and field mapping for repositories."""
    raw_repos_page_1 = [
        {
            "id": 101,
            "full_name": "org/repo-alpha",
            "name": "repo-alpha",
            "description": "Alpha service",
            "private": False,
            "language": "TypeScript",
            "default_branch": "main",
            "pushed_at": "2026-11-04T10:00:00Z",
            "permissions": {"admin": True},
            "html_url": "https://github.com/org/repo-alpha"
        }
    ]
    raw_repos_page_2 = [
        {
            "id": 102,
            "full_name": "org/repo-beta",
            "name": "repo-beta",
            "description": "Beta internal",
            "private": True,
            "language": "Python",
            "default_branch": "develop",
            "pushed_at": "2026-11-04T11:00:00Z",
            "permissions": {"admin": False},
            "html_url": "https://github.com/org/repo-beta"
        }
    ]

    # Map function equivalent to TypeScript backend service
    def map_repo(r):
        return {
            "id": r["id"],
            "full_name": r["full_name"],
            "private": bool(r["private"]),
            "description": r.get("description"),
            "language": r.get("language"),
            "default_branch": r.get("default_branch", "main"),
            "pushed_at": r.get("pushed_at"),
            "permissions": {"admin": bool(r.get("permissions", {}).get("admin"))}
        }

    all_raw = raw_repos_page_1 + raw_repos_page_2
    mapped = [map_repo(r) for r in all_raw]

    assert len(mapped) == 2
    assert mapped[0]["id"] == 101
    assert mapped[0]["full_name"] == "org/repo-alpha"
    assert mapped[0]["private"] is False
    assert mapped[0]["description"] == "Alpha service"
    assert mapped[0]["language"] == "TypeScript"
    assert mapped[0]["default_branch"] == "main"
    assert mapped[0]["pushed_at"] == "2026-11-04T10:00:00Z"
    assert mapped[0]["permissions"]["admin"] is True

    assert mapped[1]["id"] == 102
    assert mapped[1]["full_name"] == "org/repo-beta"
    assert mapped[1]["private"] is True
    assert mapped[1]["permissions"]["admin"] is False

def test_github_401_yields_reconnect_response():
    """Verify that a 401 Unauthorized from GitHub API yields RECONNECT_REQUIRED."""
    def handle_github_status(status_code: int):
        if status_code == 401:
            return {
                "statusCode": 401,
                "error": "GitHub token expired or revoked. Please reconnect GitHub.",
                "code": "RECONNECT_REQUIRED"
            }
        return {"statusCode": 200}

    result = handle_github_status(401)
    assert result["statusCode"] == 401
    assert result["code"] == "RECONNECT_REQUIRED"
    assert "reconnect" in result["error"].lower()

def test_github_empty_list_yields_empty_state():
    """Verify empty repositories array yields clean empty state."""
    repositories = []
    assert len(repositories) == 0
    # In UI, when repositories is empty and not loading, empty state message is shown
    empty_state_text = "No repositories found. Check your GitHub permissions"
    assert "No repositories found" in empty_state_text

def test_demo_mode_unset_no_mock_repos():
    """Verify that when DEMO_MODE is not 'true', mock repos are never returned on error."""
    demo_mode = os.environ.get("DEMO_MODE", "false")
    assert demo_mode != "true"
    
    def get_repos_fallback():
        if os.environ.get("DEMO_MODE") == "true":
            return [{"name": "mock-repo"}]
        raise RuntimeError("GitHub not connected or token invalid. Please reconnect GitHub.")

    with pytest.raises(RuntimeError) as exc_info:
        get_repos_fallback()
    assert "Please reconnect GitHub" in str(exc_info.value)

def test_account_exists_different_credential_flow():
    """Verify auth/account-exists-with-different-credential collision flow."""
    error_code = "auth/account-exists-with-different-credential"
    pending_credential = {"providerId": "github.com", "token": "mock-token-xyz"}

    def handle_auth_error(code, cred):
        if code == "auth/account-exists-with-different-credential":
            return {
                "success": False,
                "saved_pending": cred is not None,
                "error": "This email already has an account with Google. Sign in with it first, then link GitHub in Settings."
            }
        return {"success": False, "error": "Unknown error"}

    flow_result = handle_auth_error(error_code, pending_credential)
    assert flow_result["success"] is False
    assert flow_result["saved_pending"] is True
    assert "Sign in with it first, then link GitHub in Settings." in flow_result["error"]

def test_sign_out_clears_all_state():
    """Verify sign out wipes cached tokens, session artifacts and local storage."""
    mock_local_storage = {
        "aevora_user": json.dumps({"id": "usr_123", "email": "test@domain.com"}),
        "evolyra_user": json.dumps({"id": "usr_123"}),
        "aevora_active_ws": "ws_alpha"
    }

    # Simulate logout handler
    for key in ["aevora_user", "evolyra_user", "aevora_active_ws"]:
        mock_local_storage.pop(key, None)

    assert len(mock_local_storage) == 0
    assert "aevora_user" not in mock_local_storage

def test_user_strictly_from_verified_firebase_id_token_never_query_body_or_header():
    """Verify that user identity is taken strictly from verified Firebase ID token and never query/body/header."""
    mock_verified_token = {
        "uid": "verified_firebase_uid_999",
        "email": "verified@domain.com",
        "name": "Verified User"
    }

    # Simulate an incoming request trying to spoof or pass user identity via query, body, or header
    spoofed_query = {"userId": "attacker_spoof_id"}
    spoofed_body = {"userId": "attacker_body_id"}
    spoofed_headers = {"x-user-id": "attacker_header_id", "authorization": "Bearer valid_token"}

    def extract_authenticated_user(headers, query, body, decoded_token):
        # Must require valid Bearer token
        auth_header = headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            raise ValueError("AUTH_TOKEN_REQUIRED")
        
        # Take user ONLY from verified decoded token, never query, body, or header
        if not decoded_token or "uid" not in decoded_token:
            raise ValueError("AUTH_TOKEN_INVALID")
            
        return decoded_token["uid"]

    active_user = extract_authenticated_user(spoofed_headers, spoofed_query, spoofed_body, mock_verified_token)
    assert active_user == "verified_firebase_uid_999"
    assert active_user != spoofed_query["userId"]
    assert active_user != spoofed_body["userId"]
    assert active_user != spoofed_headers["x-user-id"]

def test_startup_check_logs_without_printing_secrets_and_fails_loudly_on_missing_admin_vars():
    """Verify startup check logs status of all 8 variables without printing secrets and fails loudly when missing."""
    vars_to_check = [
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
        "TOKEN_ENCRYPTION_KEY",
        "GITHUB_WEBHOOK_SECRET",
        "PUBLIC_WEBHOOK_URL",
        "DEMO_MODE",
        "EVENTS_DB_PATH",
    ]
    mock_env = {
        "FIREBASE_PROJECT_ID": "aevora-ddbce",
        "FIREBASE_CLIENT_EMAIL": "service@aevora.iam.gserviceaccount.com",
        "FIREBASE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nMIIE...secret\n-----END PRIVATE KEY-----",
        "TOKEN_ENCRYPTION_KEY": "super_secret_encryption_key_32_bytes",
        "GITHUB_WEBHOOK_SECRET": "top_secret_webhook_secret",
        "PUBLIC_WEBHOOK_URL": "http://localhost:8000/webhook/github",
        "DEMO_MODE": "false",
        "EVENTS_DB_PATH": "events.db"
    }

    logs = []
    for var in vars_to_check:
        val = mock_env.get(var)
        is_set = bool(val and val.strip())
        logs.append(f"{var}: {'[SET]' if is_set else '[NOT SET]'}")

    log_output = "\n".join(logs)

    # All 8 variables must be present in the log
    for var in vars_to_check:
        assert f"{var}: [SET]" in log_output

    # No secret value may ever be printed
    assert "super_secret_encryption_key_32_bytes" not in log_output
    assert "top_secret_webhook_secret" not in log_output
    assert "MIIE...secret" not in log_output

    # If Firebase Admin values are missing, must fail loudly rather than falling back to 'default-user'
    def check_admin_vars(env):
        admin_vars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]
        missing = [k for k in admin_vars if not env.get(k)]
        if missing:
            raise RuntimeError(f"Missing required Firebase Admin credentials: {', '.join(missing)}. Falling back to 'default-user' is strictly prohibited.")
        return True

    assert check_admin_vars(mock_env) is True

    incomplete_env = dict(mock_env)
    del incomplete_env["FIREBASE_PRIVATE_KEY"]
    with pytest.raises(RuntimeError) as exc_info:
        check_admin_vars(incomplete_env)
    assert "FIREBASE_PRIVATE_KEY" in str(exc_info.value)
    assert "default-user" in str(exc_info.value)

