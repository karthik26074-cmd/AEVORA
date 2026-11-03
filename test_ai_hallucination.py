import json
import pytest
import re
from typing import List, Dict, Any, Optional

# ============================================================================
# AEVORA AI ASSISTANT HALLUCINATION & FACT VERIFICATION TEST SUITE
# Requirements:
# (a) A mocked LLM that returns a wrong date is caught and removed;
# (b) A question with no matching events returns "No record found" without calling the LLM;
# (c) An invented event_id is rejected;
# (d) The displayed dates equal the database dates.
# ============================================================================

SAMPLE_EVENTS = [
    {
        "id": "evt-otp-1-proposed",
        "featureId": "feat-otp-verification",
        "featureName": "OTP Verification",
        "eventType": "FEATURE_PROPOSED",
        "status": "VALIDATED",
        "newState": "Proposed",
        "eventDate": "2024-05-10",
        "person": "Sarah Chen (Lead PM)",
        "description": "OTP Verification proposed with 300-second expiration window and SMS carrier integration.",
        "evidenceText": "Proposal 2: OTP Verification must be triggered upon login from unrecognized devices.",
        "sourceRecordId": "rec-prd-auth-v1",
    },
    {
        "id": "evt-otp-2-approved",
        "featureId": "feat-otp-verification",
        "featureName": "OTP Verification",
        "eventType": "FEATURE_APPROVED",
        "status": "VALIDATED",
        "newState": "Approved",
        "eventDate": "2024-05-12",
        "person": "Marcus Vance (Principal Architect)",
        "description": "Architecture review board approves OTP Verification design with Redis rate limiter.",
        "evidenceText": "OTP Verification specification approved with Redis-backed rate limiting.",
        "sourceRecordId": "rec-arch-review-may12",
    },
    {
        "id": "evt-otp-3-implemented",
        "featureId": "feat-otp-verification",
        "featureName": "OTP Verification",
        "eventType": "FEATURE_IMPLEMENTED",
        "status": "VALIDATED",
        "newState": "Implemented",
        "eventDate": "2024-05-18",
        "person": "Devin K (Senior Backend Engineer)",
        "description": "OTP verification service merged to main via PR #104.",
        "evidenceText": "Pull Request #104 merged: implement otp verification module.",
        "sourceRecordId": "rec-pr-104-impl",
    },
    {
        "id": "evt-otp-4-modified",
        "featureId": "feat-otp-verification",
        "featureName": "OTP Verification",
        "eventType": "FEATURE_MODIFIED",
        "status": "VALIDATED",
        "newState": "Modified",
        "eventDate": "2024-05-22",
        "person": "Rachel Wei (CISO)",
        "description": "Security audit reduces OTP validity from 300s to 120s per PCI-DSS mandate.",
        "evidenceText": "Modified requirement: OTP expiration time must be reduced immediately to 120 seconds.",
        "sourceRecordId": "rec-sec-audit-may22",
    },
]

SAMPLE_RECORDS = [
    {"id": "rec-prd-auth-v1", "fileName": "PRD-2024-Authentication-v1.0.md", "author": "Sarah Chen"},
    {"id": "rec-arch-review-may12", "fileName": "ARCH-REVIEW-2024-05-12.md", "author": "Marcus Vance"},
    {"id": "rec-pr-104-impl", "fileName": "GitHub PR #104: feat(auth): implement otp.md", "author": "Devin K"},
    {"id": "rec-sec-audit-may22", "fileName": "SEC-AUDIT-2024-05-22.md", "author": "Rachel Wei"},
]

KNOWN_STATUS_WORDS = [
    "proposed", "approved", "implemented", "modified", "renamed",
    "rejected", "removed", "deprecated", "under_review", "in_development",
    "closed", "merged"
]


def retrieve_events(question: str, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """1. Retrieval: Query events table for matching events. If none match, returns empty list."""
    q_lower = question.lower().strip()

    # Project / Workspace summary detection
    is_project_query = bool(
        re.search(r"^(summarise|summarize)\b", q_lower)
        or (re.search(r"\b(summarise|summarize|summary|overview|about|describe)\b", q_lower) and re.search(r"\b(project|workspace|product|platform|system|application|app|all features|features)\b", q_lower))
    )
    if is_project_query:
        return sorted(events, key=lambda e: e.get("eventDate", ""))

    # Common feature mappings & synonyms
    if "otp" in q_lower or "verification" in q_lower or "2fa" in q_lower or "sms" in q_lower:
        matched = [e for e in events if "otp" in e["featureName"].lower()]
    elif "payment" in q_lower or "stripe" in q_lower or "gateway" in q_lower:
        matched = [e for e in events if "payment" in e["featureName"].lower()]
    elif "reconciliation" in q_lower or "ledger" in q_lower:
        matched = [e for e in events if "reconciliation" in e["featureName"].lower() or "transaction" in e["featureName"].lower()]
    else:
        # Keyword search with exact word boundary matching and stop words
        stop_words = {"what", "when", "where", "which", "how", "did", "was", "the", "for", "with", "status", "engine", "feature", "system"}
        words = [w for w in re.findall(r"\b\w{3,}\b", q_lower) if w not in stop_words]
        matched = []
        for e in events:
            text = f"{e['featureName']} {e['description']} {e['evidenceText']} {e.get('person', '')}".lower()
            event_words = set(re.findall(r"\b\w+\b", text))
            if any(w in event_words for w in words):
                matched.append(e)

    # Date filter
    year_match = re.search(r"\b(20\d\d)\b", q_lower)
    if year_match and matched:
        year = year_match.group(1)
        year_filtered = [e for e in matched if e.get("eventDate", "").startswith(year)]
        if year_filtered:
            matched = year_filtered

    return matched


def verify_summary_and_event_ids(summary: str, event_ids: List[str], retrieved_events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """4. Verification: Extract dates and status words. Verify event_ids exist and belong to results."""
    retrieved_id_set = {e["id"] for e in retrieved_events}

    # (c) Check for invented event_ids
    has_invented_ids = any(eid not in retrieved_id_set for eid in event_ids)
    valid_event_ids = [eid for eid in event_ids if eid in retrieved_id_set]

    if has_invented_ids or not valid_event_ids:
        return {
            "is_valid": False,
            "error": f"Invented event_id detected. IDs must belong to retrieved events: {list(retrieved_id_set)}",
            "verified_ids": valid_event_ids or [e["id"] for e in retrieved_events],
        }

    selected_events = [e for e in retrieved_events if e["id"] in valid_event_ids]

    # Extract all dates in summary (YYYY-MM-DD and 4-digit years)
    iso_dates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", summary)
    years = re.findall(r"\b(19\d\d|20\d\d)\b", summary)

    allowed_dates = {e["eventDate"] for e in selected_events if e.get("eventDate")}
    allowed_years = {e["eventDate"][:4] for e in selected_events if e.get("eventDate")}

    # Verify ISO dates
    for d in iso_dates:
        if d not in allowed_dates:
            return {
                "is_valid": False,
                "error": f"Date '{d}' in summary does not exist in selected events.",
                "verified_ids": valid_event_ids,
            }

    # Verify 4-digit years
    for y in years:
        if y not in allowed_years:
            return {
                "is_valid": False,
                "error": f"Year '{y}' in summary does not exist in selected events.",
                "verified_ids": valid_event_ids,
            }

    # Extract and verify status words
    allowed_statuses = set()
    for e in selected_events:
        for key in ["newState", "status", "eventType"]:
            val = e.get(key, "").lower().replace("feature_", "").replace("_", " ")
            if val:
                allowed_statuses.add(val)

    summary_lower = summary.lower()
    for status_word in KNOWN_STATUS_WORDS:
        clean = status_word.replace("_", " ")
        if re.search(rf"\b{clean}\b", summary_lower):
            if not any(clean in s or s in clean for s in allowed_statuses):
                return {
                    "is_valid": False,
                    "error": f"Status '{status_word}' in summary does not exist in selected events.",
                    "verified_ids": valid_event_ids,
                }

    return {"is_valid": True, "verified_ids": valid_event_ids}


def assemble_answer_in_code(selected_events: List[Dict[str, Any]], records: List[Dict[str, Any]], summary: Optional[str]) -> Dict[str, Any]:
    """3. Answer assembly in CODE, not by the LLM."""
    sorted_events = sorted(selected_events, key=lambda x: x.get("eventDate", ""))

    first_recorded = sorted_events[0]["eventDate"]
    last_event = sorted_events[-1]["eventDate"]
    current_status = sorted_events[-1].get("newState") or sorted_events[-1].get("status")

    record_map = {r["id"]: r for r in records}

    timeline = []
    for e in sorted_events:
        rec = record_map.get(e["sourceRecordId"], {})
        timeline.append({
            "id": e["id"],
            "eventDate": e["eventDate"],
            "status": e.get("newState") or e.get("status"),
            "actor": e.get("person") or rec.get("author", "Team Member"),
            "sourceFile": rec.get("fileName", "Source Document"),
            "quote": e.get("evidenceText") or e.get("description"),
            "description": e["description"],
        })

    citations = []
    seen_records = set()
    for e in sorted_events:
        rec_id = e["sourceRecordId"]
        if rec_id not in seen_records:
            seen_records.add(rec_id)
            rec = record_map.get(rec_id, {})
            citations.append({
                "sourceRecordId": rec_id,
                "recordName": rec.get("fileName", "Document"),
                "evidenceText": e.get("evidenceText", ""),
                "eventDate": e.get("eventDate"),
            })

    return {
        "entityName": sorted_events[0]["featureName"],
        "currentStatus": current_status,
        "firstRecorded": first_recorded,
        "lastEvent": last_event,  # Strictly "Last event" (not "Last Modified")
        "summary": summary,
        "timeline": timeline,
        "citations": citations,
        "noRecordFound": False,
    }


def execute_qa_pipeline(question: str, events: List[Dict[str, Any]], records: List[Dict[str, Any]], mock_llm_fn: Any) -> Dict[str, Any]:
    """Complete verification pipeline."""
    # 1. Retrieval
    retrieved = retrieve_events(question, events)
    if not retrieved:
        # Return immediately without calling the LLM
        return {
            "content": "No record found for this question.",
            "structuredAnswer": {"noRecordFound": True, "timeline": []},
            "llm_called": False,
        }

    # 2. LLM Call
    raw_response = mock_llm_fn(retrieved, question, None)
    summary = raw_response.get("summary", "")
    event_ids = raw_response.get("event_ids", [])

    # 4. Verification
    ver = verify_summary_and_event_ids(summary, event_ids, retrieved)
    verified_ids = ver["verified_ids"]

    if ver["is_valid"]:
        final_summary = summary
    else:
        # Retry once with error message
        retry_response = mock_llm_fn(retrieved, question, ver["error"])
        retry_summary = retry_response.get("summary", "")
        retry_ids = retry_response.get("event_ids", [])
        ver2 = verify_summary_and_event_ids(retry_summary, retry_ids, retrieved)
        verified_ids = ver2["verified_ids"]

        if ver2["is_valid"]:
            final_summary = retry_summary
        else:
            # Drop the summary and show the code-built timeline only!
            final_summary = None

    # 3. Answer assembly in CODE
    selected_events = [e for e in retrieved if e["id"] in verified_ids]
    structured = assemble_answer_in_code(selected_events, records, final_summary)

    return {
        "content": final_summary or f"Timeline assembled from {len(structured['timeline'])} verified events.",
        "structuredAnswer": structured,
        "llm_called": True,
    }


# ============================================================================
# TEST CASES (a), (b), (c), (d)
# ============================================================================

def test_a_mocked_llm_wrong_date_is_caught_and_removed():
    """(a) A mocked LLM that returns a wrong date is caught and removed."""
    call_count = 0

    def mock_llm(retrieved, question, error_msg):
        nonlocal call_count
        call_count += 1
        # The mocked LLM hallucinates an invalid date "2029-12-31" on both attempts
        return {
            "event_ids": ["evt-otp-1-proposed", "evt-otp-4-modified"],
            "summary": "OTP was proposed on 2024-05-10 and modified on 2029-12-31 per policy.",
        }

    result = execute_qa_pipeline(
        "When was OTP Verification proposed and modified?",
        SAMPLE_EVENTS,
        SAMPLE_RECORDS,
        mock_llm
    )

    # 1. LLM was called and retried (2 calls total)
    assert call_count == 2
    assert result["llm_called"] is True

    # 2. Because the LLM persisted with a wrong date, summary is DROPPED (None)
    assert result["structuredAnswer"]["summary"] is None

    # 3. The code-built timeline is still fully assembled from real database rows
    timeline = result["structuredAnswer"]["timeline"]
    assert len(timeline) == 2
    assert timeline[0]["eventDate"] == "2024-05-10"
    assert timeline[1]["eventDate"] == "2024-05-22"
    # No hallucinated date anywhere in timeline
    for item in timeline:
        assert item["eventDate"] != "2029-12-31"


def test_b_no_matching_events_returns_no_record_found_without_calling_llm():
    """(b) A question with no matching events returns 'No record found' without calling the LLM."""
    llm_was_called = False

    def mock_llm(retrieved, question, error_msg):
        nonlocal llm_was_called
        llm_was_called = True
        return {"event_ids": [], "summary": "Hallucinated info"}

    # Question about an entity that does not exist in the database
    result = execute_qa_pipeline(
        "What is the status of Quantum QuantumTeleportation Engine?",
        SAMPLE_EVENTS,
        SAMPLE_RECORDS,
        mock_llm
    )

    # 1. LLM must NOT be called
    assert llm_was_called is False
    assert result["llm_called"] is False

    # 2. Must return exact phrase: "No record found for this question."
    assert "No record found for this question." in result["content"]
    assert result["structuredAnswer"]["noRecordFound"] is True
    assert len(result["structuredAnswer"]["timeline"]) == 0


def test_c_invented_event_id_is_rejected():
    """(c) An invented event_id is rejected."""
    call_count = 0

    def mock_llm(retrieved, question, error_msg):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # First attempt returns an invented fake event ID
            return {
                "event_ids": ["evt-fake-hallucinated-id-999"],
                "summary": "OTP verification was proposed on 2024-05-10.",
            }
        else:
            # Retry corrects to a valid ID
            return {
                "event_ids": ["evt-otp-1-proposed"],
                "summary": "OTP verification was proposed on 2024-05-10.",
            }

    result = execute_qa_pipeline(
        "When was OTP proposed?",
        SAMPLE_EVENTS,
        SAMPLE_RECORDS,
        mock_llm
    )

    # The invented ID must NOT appear anywhere in the assembled timeline
    timeline_ids = [item["id"] for item in result["structuredAnswer"]["timeline"]]
    assert "evt-fake-hallucinated-id-999" not in timeline_ids
    assert "evt-otp-1-proposed" in timeline_ids


def test_d_displayed_dates_equal_database_dates():
    """(d) The displayed dates equal the database dates."""
    def mock_llm(retrieved, question, error_msg):
        return {
            "event_ids": [e["id"] for e in retrieved],
            "summary": "OTP was proposed in 2024 and modified in 2024.",
        }

    result = execute_qa_pipeline(
        "Tell me the timeline of OTP Verification",
        SAMPLE_EVENTS,
        SAMPLE_RECORDS,
        mock_llm
    )

    timeline = result["structuredAnswer"]["timeline"]
    db_dates = [e["eventDate"] for e in SAMPLE_EVENTS]

    # Every displayed date in the timeline strictly matches the database dates
    displayed_dates = [item["eventDate"] for item in timeline]
    assert displayed_dates == db_dates

    # Verified First recorded and Last event
    assert result["structuredAnswer"]["firstRecorded"] == "2024-05-10"
    assert result["structuredAnswer"]["lastEvent"] == "2024-05-22"
    assert result["structuredAnswer"]["currentStatus"] == "Modified"


def test_e_project_summary_retrieves_workspace_events():
    """(e) A high-level question 'Summarise the project' retrieves project events instead of 'No record found'."""
    llm_was_called = False

    def mock_llm(retrieved, question, error_msg):
        nonlocal llm_was_called
        llm_was_called = True
        return {"event_ids": [retrieved[0]["id"]], "summary": "Project features were recorded in 2024."}

    result = execute_qa_pipeline("Summarise the project", SAMPLE_EVENTS, SAMPLE_RECORDS, mock_llm)
    assert result["llm_called"] is True
    assert result["structuredAnswer"]["noRecordFound"] is False
    assert len(result["structuredAnswer"]["timeline"]) > 0
