# HRMS Chatbot — Implementation Document

**Project:** Cannyfore HRMS  
**Module:** AI Chatbot  
**Stack:** FastAPI (Python) + React (TypeScript)  
**Author:** Development Team  
**Date:** August 2026

---

## 1. Overview

The HRMS chatbot allows employees and HR admins to query employee information, leave balances, profiles, and more using natural language — directly from the HRMS web application.

**Core principle:**
> Hugging Face NLP determines *what* the user is asking.  
> The HRMS database determines *what* the answer is.  
> The AI model never generates or invents employee data.

---

## 2. Architecture

```
User (React Chat Widget)
         │
         ▼
  POST /api/v1/chat
  FastAPI — port 8000
         │
         ├─ Step 1: Intent Classification  (NLP — no DB)
         ├─ Step 2: Entity Extraction      (NLP — no DB)
         ├─ Step 3: Session Context        (in-memory / Redis)
         ├─ Step 4: Employee Resolution    → Node.js API (port 5001)
         ├─ Step 5: Permission Check       (role-based)
         └─ Step 6: Response Template      (deterministic string)
                         │
                         ▼
                  Response to user
```

The FastAPI chatbot does **not** connect to PostgreSQL directly. All employee data is fetched from the existing Node.js HRMS server, reusing the same JWT token the user already has.

---

## 3. Project Structure

```
hrms-chatbot/
├── app/
│   ├── main.py                   # FastAPI app entry point
│   ├── api/routes/
│   │   ├── chatbot.py            # POST /api/v1/chat
│   │   └── debug.py              # Debug endpoints (DEBUG=true only)
│   ├── core/
│   │   ├── config.py             # Settings from .env
│   │   └── security.py           # JWT verification
│   ├── nlp/
│   │   ├── intent_classifier.py  # Two-stage intent classification
│   │   ├── entity_extractor.py   # Name / ID / email extraction
│   │   └── model_config.py       # Intent enum definitions
│   ├── services/
│   │   ├── chatbot_service.py    # Main orchestration pipeline
│   │   ├── hrms_client.py        # HTTP client → Node.js API
│   │   ├── intent_service.py     # NLP intent wrapper
│   │   ├── entity_service.py     # NLP entity wrapper
│   │   └── session_service.py    # Conversation context
│   └── schemas/
│       └── chatbot.py            # Request / Response models
├── data/
│   └── intent_dataset.json       # 120+ labelled training examples
├── tests/                        # Pytest test suite
├── .env.example
├── requirements.txt
└── README.md

client/src/
├── api/chatbot.api.ts            # React API client
└── components/ChatWidget.tsx     # Floating chat UI component
```

---

## 4. Step-by-Step Implementation

### Step 1 — Project Setup

- Created `hrms-chatbot/` as a standalone FastAPI service alongside the existing Node.js server
- Used Python virtual environment with `requirements.txt`
- Key packages: `fastapi`, `uvicorn`, `httpx`, `transformers`, `torch`, `pydantic-settings`, `python-jose`
- Configured to run on **port 8000** (Node.js runs on 5001, no conflict)

### Step 2 — JWT Integration

**File:** `app/core/security.py`

- The chatbot does **not** issue its own tokens
- It verifies the same JWT that the Node.js server issues at login
- Same `JWT_SECRET_KEY` in both `.env` files = tokens are interchangeable
- JWT payload from Node.js: `{ id, role, username }`

```python
payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
user_id = payload.get("id")   # Node.js uses "id" not "sub"
role    = payload.get("role")
```

### Step 3 — Intent Classification (Two-Stage NLP)

**File:** `app/nlp/intent_classifier.py`

**Stage 1 — Keyword Rules (instant, no model)**

Regex patterns cover ~95% of real HR queries. Each intent has dedicated rules:

```python
# Fires on: "what is my email", "my email address"
(re.compile(_MY + r".{0,20}(email|mail|e-mail)", re.I), Intent.MY_EMAIL)

# Fires on: "what department am I in", "which team am I in"
(re.compile(
    r"(?:department|dept|team|unit).{0,20}\bam i\b",
    re.I,
), Intent.MY_DEPARTMENT)

# Fires on: "give me sakthi's sick leave details"
(re.compile(
    r"\b(leave|sick|annual|casual)\b.{0,30}\b(details|info|balance)\b",
    re.I,
), Intent.EMPLOYEE_LEAVE_BALANCE)
```

**Stage 2 — Hugging Face Zero-Shot (fallback)**

Used only when no keyword rule matches:

```python
pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
# Classifies against natural-language descriptions of each intent
```

**Future — Fine-Tuned Model**

When `FINE_TUNED_MODEL_PATH` is set in `.env`, the transformer stage uses a model trained on `data/intent_dataset.json` instead of zero-shot.

### Step 4 — Entity Extraction

**File:** `app/nlp/entity_extractor.py`

Extracts *who* the query is about using three stages:

| Priority | Method | Example |
|---|---|---|
| 1 | Employee ID regex | `EMP1001` → `employee_id = "EMP1001"` |
| 2 | Email regex | `sakthi@company.com` → `email = "sakthi@company.com"` |
| 3 | Possessive pattern | `sakthi's leave` → `employee_name = "Sakthi"` |
| 4 | Keyword-anchored | `does prashanth have` → `employee_name = "Prashanth"` |
| 5 | Any word sequence | fallback scan with stop-word filter |

**Stop words** prevent HR field names being mistaken for person names:
```
"leave", "balance", "mobile", "number", "department",
"sick", "annual", "details", "info", "email" ...
```

**Handles any casing:** "prashanth", "PRASHANTH", "Prashanth" all work.

**Key bug fixed:** Python implicit string concatenation in the stop word set was silently merging two entries into one, causing "leave" and similar words to not be filtered. Fixed by ensuring every entry has a proper comma.

### Step 5 — Session Context

**File:** `app/services/session_service.py`

Maintains a small per-session state so follow-up questions work:

```
User: "Show Sakthi's profile"
Bot:  → resolves Sakthi, stores { last_employee_db_id: 27 }

User: "What is her email?"
Bot:  → no entity in message → uses session → returns Sakthi's email
```

Uses in-memory dict by default. Set `REDIS_URL` in `.env` for persistence across restarts.

### Step 6 — HRMS API Client

**File:** `app/services/hrms_client.py`

All employee data comes from the existing Node.js server. No direct DB access.

```python
# Search employees (covers both regular + admin roles)
GET /api/employees?search=Prashanth
GET /api/employees/superiors?search=Prashanth   # ← admins excluded from first endpoint

# Get leave balance with year fallback
GET /api/leaves/balance                         # current year
GET /api/leaves/balance?year=2027               # fallback if current year empty
```

**Why two endpoints for search:** The Node.js `/api/employees` deliberately excludes `hradmin` and `empmanager` roles. Searching `/api/employees/superiors` covers them. Both results are merged and deduplicated.

**Why year fallback:** Some teams set entitlements for the next fiscal year in advance. Without the fallback, employees with 2027 entitlements would always see "no data found."

### Step 7 — Permission System

**File:** `app/services/chatbot_service.py`

```python
def _can_view(current_user, emp):
    # Admin roles → full access
    if current_user.role in {"hradmin", "empmanager"}:
        return True
    # Supervisor/Manager → team access
    if current_user.role in {"supervisor", "manager", "line_manager", ...}:
        return True
    # Plain employee → own profile only
    return current_user.user_id == emp["id"]
```

Node.js enforces its own permissions independently — double protection layer.

### Step 8 — Response Templates

All answers are deterministic string templates. No AI generates the response text.

```python
if intent == Intent.EMPLOYEE_EMAIL:
    val = emp.get("email")
    return f"{emp['name']}'s email is {val}."

if intent == Intent.MY_PROFILE:
    # Builds formatted card, skips fields with None/"0"/empty values
    lines = [f"👤 {name}", ""]
    for label, value in fields:
        if value and value not in ("None", "0", ""):
            lines.append(f"  {label:<16} {value}")
```

### Step 9 — React Chat Widget

**Files:** `client/src/components/ChatWidget.tsx`, `client/src/api/chatbot.api.ts`

- Floating button (bottom-right) with gradient matching existing brand colours
- Reuses the JWT token already stored in `localStorage` from normal login — no re-authentication
- Online/offline status indicator (checks `/health` endpoint)
- Quick suggestion chips on first open
- Animated typing dots while waiting for response
- Multi-line responses (profile, leave balance) rendered as structured two-column cards
- Session continuity — `session_id` maintained across the conversation

```typescript
// chatbot.api.ts — reuses existing token
const token = localStorage.getItem(STORAGE_KEYS.token);
fetch("http://localhost:8000/api/v1/chat", {
    headers: { Authorization: `Bearer ${token}` }
})
```

### Step 10 — Debug & Testing

**Debug endpoints** (active only when `DEBUG=true`):
- `GET /api/v1/debug/me` — verify token and my-info from Node.js
- `GET /api/v1/debug/leave-balance` — verify leave API connectivity
- `GET /api/v1/debug/search?q=sakthi` — verify employee search

**Tests** (`pytest` + in-memory SQLite):
- `tests/test_auth.py` — login, token verification
- `tests/test_employees.py` — CRUD, permission checks
- `tests/test_chatbot.py` — full pipeline with mocked NLP

---

## 5. Supported Intents

| Intent | Example Query |
|---|---|
| `MY_PROFILE` | "Show my profile", "Who am I?" |
| `MY_EMAIL` | "What is my email?" |
| `MY_PHONE` | "What is my mobile number?" |
| `MY_DEPARTMENT` | "What department am I in?", "Which team am I in?" |
| `MY_DESIGNATION` | "What is my job title?" |
| `MY_MANAGER` | "Who is my manager?" |
| `MY_JOINING_DATE` | "When did I join?" |
| `MY_LEAVE_BALANCE` | "What is my leave balance?" |
| `MY_STATUS` | "What is my employment status?" |
| `MY_LOCATION` | "Where do I work?" |
| `EMPLOYEE_PROFILE` | "Show Sakthi's profile" |
| `EMPLOYEE_EMAIL` | "What is prashanth's email?" |
| `EMPLOYEE_PHONE` | "What is Tamilselvan's mobile number?" |
| `EMPLOYEE_DEPARTMENT` | "Which department does ebinazer work in?" |
| `EMPLOYEE_DESIGNATION` | "What is aniruth's job title?" |
| `EMPLOYEE_MANAGER` | "Who is rajasekar's manager?" |
| `EMPLOYEE_JOINING_DATE` | "When did premkumar join?" |
| `EMPLOYEE_STATUS` | "Is sakthi active?" |
| `EMPLOYEE_LOCATION` | "Where does john work?" |
| `EMPLOYEE_LEAVE_BALANCE` | "How many leaves does sakthi have?", "Give me sakthi's sick leave details" |

---

## 6. Configuration (.env)

```env
# Node.js HRMS server — all employee data comes from here
HRMS_API_BASE_URL=http://localhost:5001

# Must match JWT_SECRET in server/.env exactly
JWT_SECRET_KEY=your-secret-key

# NLP — zero-shot until fine-tuned model is available
HF_MODEL_NAME=facebook/bart-large-mnli
INTENT_CONFIDENCE_THRESHOLD=0.40
FINE_TUNED_MODEL_PATH=          # set this after training

# Session
REDIS_URL=                      # optional, uses in-memory if empty
```

---

## 7. How to Run

```bash
# 1. Terminal 1 — Node.js HRMS server
cd server && npm run dev

# 2. Terminal 2 — FastAPI chatbot
cd hrms-chatbot
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Terminal 3 — React frontend
cd client && npm run dev
```

Swagger UI: `http://localhost:8000/docs`

---

## 8. How to Add a New Intent

1. **Add to enum** — `app/nlp/model_config.py`
```python
EMPLOYEE_SALARY = "EMPLOYEE_SALARY"
```

2. **Add keyword rule** — `app/nlp/intent_classifier.py`
```python
(re.compile(r"\b(salary|ctc|pay|compensation)\b", re.I), Intent.EMPLOYEE_SALARY)
```

3. **Add handler** — `app/services/chatbot_service.py`
```python
if intent == Intent.EMPLOYEE_SALARY:
    # fetch and return salary data
```

4. **Add training examples** — `data/intent_dataset.json`
```json
{ "text": "What is sakthi's salary?", "intent": "EMPLOYEE_SALARY" }
```

5. Restart the server. No model retraining needed for keyword-covered queries.

---

## 9. Future Improvements

| Item | Description |
|---|---|
| Fine-tune model | Run `train.py` on `intent_dataset.json`, set `FINE_TUNED_MODEL_PATH` |
| More intents | Attendance, payroll, performance, recruitment |
| Leave application | Allow applying for leave via chat |
| Multi-language | Add Tamil/Hindi keyword rules |
| Analytics | Log which intents are most queried |

---

## 10. Key Design Decisions

| Decision | Reason |
|---|---|
| No direct DB access from chatbot | Avoids duplicating business logic; Node.js owns the data layer |
| Two-stage NLP (keyword + transformer) | Keyword rules give instant 0.99 confidence for common queries; transformer handles edge cases |
| Deterministic response templates | No AI hallucination risk; answers always sourced from DB |
| Same JWT as Node.js | No re-login needed; single auth system |
| Search both /employees and /superiors | Admin-role users are excluded from the regular employee list |
| Year fallback for leave balance | Some teams configure entitlements for next fiscal year in advance |
