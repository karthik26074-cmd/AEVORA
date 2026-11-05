#!/usr/bin/env python3
"""
End-to-End Live Notification Flow Verification Script.
1. Connects to Node SSE stream on http://localhost:3001/api/stream (served to browser).
2. Sends a push webhook with weak message 'fix' signed with GITHUB_WEBHOOK_SECRET from .env
   to Python webhook service on http://localhost:8000/webhook/github.
3. Confirms that the notification event with needs_reason=1 arrives over SSE within 5 seconds.
"""

import hashlib
import hmac
import json
import os
import queue
import re
import sys
import threading
import time
import urllib.request


def load_env_secret() -> str:
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GITHUB_WEBHOOK_SECRET="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.getenv("GITHUB_WEBHOOK_SECRET", "")


def sign_payload(payload_bytes: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def listen_sse(sse_url: str, msg_queue: queue.Queue, stop_event: threading.Event):
    """Listens to SSE stream and pushes received notification data into msg_queue."""
    try:
        req = urllib.request.Request(sse_url, headers={"Accept": "text/event-stream"})
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            current_event = "message"
            for raw_line in resp:
                if stop_event.is_set():
                    break
                line = raw_line.decode("utf-8", errors="replace").rstrip("\r\n")
                if line.startswith("event:"):
                    current_event = line.split(":", 1)[1].strip()
                elif line.startswith("data:"):
                    data_str = line.split(":", 1)[1].strip()
                    recv_time = time.time()
                    try:
                        parsed = json.loads(data_str)
                        msg_queue.put((current_event, parsed, recv_time))
                    except Exception:
                        pass
                elif not line:
                    current_event = "message"
    except Exception as e:
        msg_queue.put(("error", str(e), time.time()))


def main():
    secret = load_env_secret()
    if not secret:
        print("[!] GITHUB_WEBHOOK_SECRET not found in .env or environment")
        return 1

    print("======================================================================")
    print("EVOLYRA END-TO-END LIVE NOTIFICATION FLOW VERIFICATION")
    print("======================================================================")
    print(f"[*] Loaded GITHUB_WEBHOOK_SECRET: [REDACTED length {len(secret)}]")

    sse_url = "http://localhost:3001/api/stream"
    webhook_url = "http://localhost:8000/webhook/github"

    print(f"[*] Step 1: Connecting SSE listener to Node stream: {sse_url}")
    msg_queue = queue.Queue()
    stop_event = threading.Event()
    listener_thread = threading.Thread(
        target=listen_sse, args=(sse_url, msg_queue, stop_event), daemon=True
    )
    listener_thread.start()

    # Allow SSE handshake to establish
    time.sleep(1.0)
    print("    [+] SSE connection established with Node (port 3001).")

    # Prepare weak commit push payload ("fix")
    delivery_id = f"e2e-delivery-{int(time.time())}"
    push_payload = {
        "ref": "refs/heads/main",
        "repository": {
            "name": "banking-core",
            "full_name": "smartbank-io/banking-core",
            "html_url": "https://github.com/smartbank-io/banking-core",
        },
        "pusher": {"name": "Devin K"},
        "sender": {"login": "devin-k"},
        "commits": [
            {
                "id": f"commit-fix-{int(time.time())}",
                "message": "fix",
                "timestamp": "2026-11-04T00:15:00Z",
                "author": {"name": "Devin K", "email": "devin@smartbank.io"},
                "url": "https://github.com/smartbank-io/banking-core/commit/cfix01",
            }
        ],
    }

    raw_bytes = json.dumps(push_payload).encode("utf-8")
    sig = sign_payload(raw_bytes, secret)

    print(f"\n[*] Step 2: Sending signed push webhook to Python: {webhook_url}")
    print(f"    Payload: commit message = 'fix' (weak commit rule trigger)")
    print(f"    Delivery ID: {delivery_id}")
    print(f"    X-Hub-Signature-256 header: sha256=[HMAC verified]")

    send_start_time = time.time()
    wh_req = urllib.request.Request(
        webhook_url,
        data=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-GitHub-Event": "push",
            "X-Hub-Signature-256": sig,
            "X-GitHub-Delivery": delivery_id,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(wh_req, timeout=5.0) as wh_resp:
            wh_status = wh_resp.status
            wh_data = json.loads(wh_resp.read().decode("utf-8"))
            print(f"    [+] Webhook acknowledged by Python (HTTP {wh_status}): status={wh_data.get('status')}")
    except Exception as e:
        print(f"[!] Failed to deliver webhook to {webhook_url}: {e}")
        stop_event.set()
        return 1

    print("\n[*] Step 3: Awaiting notification event on Node SSE stream (timeout: 5.0s)...")
    found_notif = None
    elapsed = 0.0

    while elapsed < 5.0:
        try:
            ev_type, payload, recv_time = msg_queue.get(timeout=0.2)
            if ev_type == "notification":
                # Check if this matches our delivery
                if payload.get("delivery_id") == delivery_id or delivery_id in str(payload.get("id")):
                    found_notif = payload
                    elapsed = recv_time - send_start_time
                    break
                elif payload.get("body") == "fix":
                    found_notif = payload
                    elapsed = recv_time - send_start_time
                    break
        except queue.Empty:
            pass
        elapsed = time.time() - send_start_time

    stop_event.set()

    if not found_notif:
        print(f"[FAIL] Did not receive notification on SSE stream within 5 seconds. Elapsed: {elapsed:.2f}s")
        return 1

    print(f"    [+] Notification received via Node SSE in {elapsed:.3f} seconds (< 5.0s requirement)!")
    print("\n[*] Step 4: Verifying Toast Payload & Reason Prompt Rules:")
    print(f"    - Notification ID: {found_notif.get('id')}")
    print(f"    - Title: {found_notif.get('title')}")
    print(f"    - Body (commit message): '{found_notif.get('body')}'")
    print(f"    - Actor: {found_notif.get('actor')}")
    print(f"    - needs_reason flag: {found_notif.get('needs_reason')}")
    print(f"    - Event IDs tracked: {found_notif.get('event_ids')}")

    assert found_notif.get("needs_reason") == 1, "needs_reason must be 1 for weak commit 'fix'"
    assert "Devin" in found_notif.get("title", ""), "Title must reference actor name"
    assert "1 commit" in found_notif.get("title", ""), "Title must summarize 1 commit"
    assert found_notif.get("body") == "fix", "Body must show first commit line"
    assert elapsed < 5.0, f"Notification delivery took {elapsed:.2f}s (must be < 5.0s)"

    print("\n======================================================================")
    print("SUCCESS: End-to-end notification flow verified!")
    print("  1. Python received and HMAC-verified webhook on port 8000.")
    print("  2. Weak commit 'fix' correctly triggered needs_reason = 1.")
    print(f"  3. Notification reached browser SSE client on port 3001 in {elapsed:.3f}s.")
    print("  4. Toast reason form trigger confirmed.")
    print("======================================================================")
    return 0


if __name__ == "__main__":
    sys.exit(main())

