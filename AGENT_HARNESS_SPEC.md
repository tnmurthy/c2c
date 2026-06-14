# C2C AGENT HARNESS SPECIFICATION 🤖
## Robust Orchestration for the Recruitment Swarm

Applying **Agent-Harness-Construction** principles to the campus2corporate (c2c) pipeline to ensure high-fidelity "Ordeal" sessions.

---

### 1. Action Space (The Toolset)
Recruiter agents MUST use the following micro-tools to maintain determinism:

| Tool Name | Type | Input Schema | Purpose |
| :--- | :--- | :--- | :--- |
| `read_audit_gap` | Read | `{ "gap_id": "string" }` | Retrieves detailed evidence for a specific technical gap. |
| `simulate_stress_test` | Macro | `{ "scenario": "string", "difficulty": 1-5 }` | Runs a high-pressure interview scenario. |
| `log_behavioral_artifact` | Write | `{ "candidate_response": "string", "sentiment": "string" }` | Records candidate performance for the final Legend. |
| `verify_code_claim` | Search | `{ "repo_url": "string", "feature": "string" }` | Directly searches the candidate's GitHub for specific claimed skills. |

---

### 2. Observation Contract
Every agent response in the "Ordeal" MUST follow this structured output shape:

```json
{
  "status": "success | warning | error",
  "summary": "One-line finding (e.g., 'Candidate failed to explain CUDA memory management.')",
  "next_actions": ["Specific follow-up question", "Escalate to Senior Engineering Agent"],
  "artifacts": ["path/to/interview_log_segment.md"],
  "evidence_score": 0-100
}
```

---

### 3. Error Recovery Contract
Agents are prohibited from stalling. If an "Ordeal" hits a dead-end:

*   **Root Cause:** "Candidate is defensive/non-technical."
*   **Instruction:** Invoke the **Psychologist Agent** to perform a "Defensive Mechanism Audit."
*   **Stop Condition:** If technical claim is unverified after 3 attempts, mark gap as "High Risk" and terminate session.

---

### 4. Context Budgeting (The "Rite of Passage" Token Limit)
To ensure context efficiency (Mandate 2):
*   **Phase Compaction:** Wipe raw interview history every 10 turns; summarize into a "Candidate State" object.
*   **Skill Loading:** Only load the **Anthropologist** skill if the client company has a "High-Touch Culture" tag.

---

### 5. Completion Criteria (Convergence)
A candidate "Passes" the Ordeal only when:
1.  All `IDENTIFIED AUDIT GAPS` from Phase 1 have an `evidence_score` > 70.
2.  The **Narratologist** has confirmed the "Professional Legend" is consistent with interview behavior.
3.  The **Psychologist** has issued a "Low Volatility" rating.

---
*Architected via Agent-Harness-Construction Skill*
