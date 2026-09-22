# HRMS Chatbot — Implementation Document

**Project:** Cannyfore HRMS  
**Module:** AI Chatbot  
**Stack:** FastAPI (Python) + React (TypeScript)  
**Date:** September 2026

---

## 1. Overview

The HRMS chatbot allows employees and HR admins to query employee information, leave balances, profiles, and more using natural language — directly from the HRMS web application.

**Core principle:**
> Keyword/sklearn NLP determines *what* the user is asking.  
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
         ├─ Step 1: Greeting / help short-circuit  (regex, no NLP)
         ├─ Step 2: Intent Classification           (keyword rules → sklearn)
         ├─ Step 3: Entity Extraction               (spaCy NER + regex)
         ├─ Step 4: Session Context                 (in-memory / Redis)
         ├─ Step 5: Employee Resolution             → Node.js API (port 5001)
         │                                          → Direct DB fallback
         ├─ Step 6: Permission Check                (role-based, two-tier for leave)
         └─ Step 7: Response Template               (deterministic string)
                         │
                         ▼
                  Response to user
```

The FastAPI chatbot calls the Node.js HRMS API for employee data, forwarding the user's own Bearer token. For employee name resolution and terminated-employee lookup it also has a direct read-only PostgreSQL connection as a fallback.

---

## 3. Project Structure

```
hrms-chatbot/
├── app/
│   ├── main.py                     # FastAPI app entry point
│   ├── api/routes/
│   │   ├── chatbot.py              # POST /api/v1/chat
│   │   └── debug.py                # Debug endpoints (DEBUG=true only)
│   ├── core/
│   │   ├── config.py               # Settings from .env
│   │   └── security.py             # JWT verification
│   ├── nlp/
│   │   ├── intent_classifier.py    # Two-stage intent classification
│   │   ├── entity_extractor.py     # Name / ID / email extraction
│   │   └── model_config.py         # Intent enum + display labels
│   ├── services/
│   │   ├── chatbot_service.py      # Main orchestration pipeline
│   │   ├── hrms_client.py          # HTTP client → Node.js API
│   │   ├── employee_cache.py       # In-process name cache (5-min TTL)
│   │   ├── db_search.py            # Direct DB fallback for terminated employees
│   │   ├── intent_service.py       # NLP intent wrapper
│   │   ├── entity_service.py       # NLP entity wrapper
│   │   └── session_service.py      # Conversation context (memory / Redis)
│   └── schemas/
│       └── chatbot.py              # Request / Response models
├── data/
│   └── intent_dataset.json         # 200+ labelled training examples
├── models/
│   └── intent_sklearn.pkl          # Trained TF-IDF + LogReg model (git-ignored)
├── tests/
├── train_intent.py                 # Re-train sklearn model
├── .env                            # Local config (not committed)
├── .env.example
└── requirements.txt

client/src/
├── api/chatbot.api.ts              # React API client
└── components/ChatWidget.tsx       # Floating chat UI component
```

---

## 4. Configuration (.env)

```env
# ── Node.js HRMS server — all employee data comes from here ─────────────────
HRMS_API_BASE_URL=http://localhost:5001

# ── Direct DB — used by employee cache + terminated-employee fallback ────────
# Must match DATABASE_URL / DB_* in server/.env
HRMS_DB_URL=postgresql://postgres:<password>@localhost:5432/hrms

# ── JWT — MUST match JWT_SECRET in server/.env exactly ──────────────────────
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256

# ── NLP ──────────────────────────────────────────────────────────────────────
INTENT_CONFIDENCE_THRESHOLD=0.50
SKLEARN_MODEL_PATH=models/intent_sklearn.pkl   # set after running train_intent.py

# ── Session ──────────────────────────────────────────────────────────────────
REDIS_URL=                    # optional; uses in-memory dict if blank
SESSION_TTL_SECONDS=1800

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]

# ── Debug (mounts /api/v1/debug/* routes) ───────────────────────────────────
DEBUG=false
```

**Key rule:** `JWT_SECRET_KEY` must equal `JWT_SECRET` in `server/.env` — the chatbot only *verifies* tokens, it never issues them.

---

## 5. Step-by-Step Implementation

### Step 1 — Greeting / Help Short-Circuit

Before NLP runs, `chatbot_service.handle_message` checks for:

- **Greetings** (`hi`, `hello`, `hey`, `good morning`, …) via a compiled regex — responds with a friendly intro + help text instantly, no NLP overhead.
- **Explicit help requests** (`help`, `?`, `what can you do`) — responds with the same help text.

This prevents these common inputs from falling through to `UNKNOWN`.

### Step 2 — JWT Integration

**File:** `app/core/security.py`

- The chatbot does **not** issue its own tokens.
- It verifies the same JWT the Node.js server issues at login, using the same `JWT_SECRET_KEY`.
- JWT payload from Node.js: `{ id, role, username }`.
- The verified token is stored as `current_user.raw_token` and forwarded verbatim to every Node.js API call.

### Step 3 — Intent Classification (Two-Stage)

**File:** `app/nlp/intent_classifier.py`

**Stage 1 — Keyword rules (~0 ms, ~95% coverage)**

Pure Python regex patterns cover every supported intent. Return confidence `0.99` on match.

```python
# MY_LEAVE_BALANCE
(re.compile(r"\b(my (leave|leaves|annual|sick|casual|pto|vacation|time off)|"
            r"(how many|how much).{0,20}(leave|days|vacation).{0,20}\b(i|me|my)\b)", re.I),
 Intent.MY_LEAVE_BALANCE)

# EMPLOYEE_LEAVE_BALANCE — must come after MY rules
(re.compile(r"\b(how many|how much).{0,20}(leave|leaves|days|vacation|time off)", re.I),
 Intent.EMPLOYEE_LEAVE_BALANCE)
```

**Stage 2 — scikit-learn TF-IDF + LogisticRegression (~5 ms)**

Trained on `data/intent_dataset.json` (200+ examples). Falls back to `UNKNOWN` when confidence < `INTENT_CONFIDENCE_THRESHOLD`.

Re-train any time new examples are added:
```bash
python train_intent.py
# Outputs models/intent_sklearn.pkl
```

### Step 4 — Entity Extraction

**File:** `app/nlp/entity_extractor.py`

Extracts *who* the query is about. Priority:

| Priority | Method | Example |
|---|---|---|
| 1 | `EMP\d+` regex | `EMP1001` → `employee_id` |
| 2 | 5+ digit numeric | `911099` → `employee_id` |
| 3 | Email regex | `sakthi@company.com` → `email` |
| 4 | spaCy `PERSON` NER | `Srirama Chandramurthy Mullapudi` → full span |
| 5 | Possessive regex | `sakthi's leave` → `Sakthi` |
| 6 | Keyword-anchored regex | `does prashanth have` → `Prashanth` |
| 7 | Any word sequence | stop-word filtered fallback |

### Step 5 — Session Context

**File:** `app/services/session_service.py`

Per-session state enables follow-up resolution:

```
User: Show Sakthi's profile.          → resolved, stored { last_employee_db_id: 27 }
User: What is her email?              → no entity → session → Sakthi's email returned
```

Backend: Redis if `REDIS_URL` is set, otherwise in-memory dict.

### Step 6 — Employee Resolution

**File:** `app/services/hrms_client.py` + `app/services/employee_cache.py`

Name queries hit the **employee cache** (direct DB, 5-minute TTL, asyncio.Lock prevents concurrent refreshes). The cache includes terminated and deleted employees — critical for HR admin queries.

ID / email queries hit the Node.js `/api/employees/chatbot-search` endpoint.

**File:** `app/services/db_search.py`

Direct read-only connection to PostgreSQL. URL resolved from `.env` in priority order:
1. `HRMS_DB_URL` (full DSN)
2. Reconstructed from `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD`

No hardcoded credentials.

### Step 7 — Permission System

**File:** `app/services/chatbot_service.py`

Two permission checks:

```python
def _can_view(current_user, emp) -> bool:
    # Admin / manager roles → any employee's basic info
    if current_user.role in {"hradmin", "empmanager"}: return True
    if current_user.role in {"supervisor", "manager", ...}: return True
    # Plain employee → own profile only
    return current_user.user_id == emp["id"]

def _can_view_leave(current_user, emp) -> bool:
    # Leave balance is more sensitive — same rule set but named separately
    # so it can be tightened independently in future
    if current_user.role in {"hradmin", "empmanager"}: return True
    if current_user.role in {"supervisor", "manager", ...}: return True
    return current_user.user_id == emp["id"]
```

Plain employees who query another person's leave balance receive a clear permission-denied message.

### Step 8 — Response Templates

All answers are deterministic string templates in `chatbot_service.py`. No AI generates response text — every value comes from the database.

Multi-line responses (profile card, leave balance) use a consistent indented format that the React widget parses and renders as a two-column card.

### Step 9 — React Chat Widget

**Files:** `client/src/components/ChatWidget.tsx`, `client/src/api/chatbot.api.ts`

- Floating button (bottom-right), gradient matches brand colours.
- Reuses the JWT already in `localStorage` — no re-authentication.
- Online/offline indicator (polls `/health`).
- **Clear-chat button** in the header (trash icon) — resets to greeting.
- **Typed error bubbles** (red background with icon):
  - `401` → "Your session has expired. Please log in again."
  - `403` → "You don't have permission to do that."
  - `500` → "The HR assistant ran into an error. Please try again shortly."
  - Network failure → "Can't reach the HR assistant server. Is it running?"
- **Unread dot** on the toggle button only when the panel is closed *and* a new bot message has arrived.
- **Quick suggestion chips** — "Employee search" pre-fills the input (`Show profile of `) so users can type the name directly rather than sending a broken partial query.
- Multi-line responses rendered as structured two-column cards with distinct header, field-row, and bullet styles.
- `role="dialog"` + `aria-label` for accessibility.

---

## 6. Supported Intents

| Intent | Example Query |
|---|---|
| `MY_PROFILE` | "Show my profile", "Who am I?" |
| `MY_EMAIL` | "What is my email?" |
| `MY_PHONE` | "What is my mobile number?" |
| `MY_DEPARTMENT` | "What department am I in?" |
| `MY_DESIGNATION` | "What is my job title?" |
| `MY_MANAGER` | "Who is my manager?" |
| `MY_JOINING_DATE` | "When did I join?" |
| `MY_LEAVE_BALANCE` | "What is my leave balance?" |
| `MY_STATUS` | "Am I still employed?" |
| `MY_LOCATION` | "Where do I work?" |
| `EMPLOYEE_PROFILE` | "Show Sakthi's profile" |
| `EMPLOYEE_EMAIL` | "What is Prashanth's email?" |
| `EMPLOYEE_PHONE` | "What is Tamilselvan's mobile number?" |
| `EMPLOYEE_DEPARTMENT` | "Which department does Ebinazer work in?" |
| `EMPLOYEE_DESIGNATION` | "What is Aniruth's job title?" |
| `EMPLOYEE_MANAGER` | "Who is Rajasekar's manager?" |
| `EMPLOYEE_JOINING_DATE` | "When did Premkumar join?" |
| `EMPLOYEE_STATUS` | "Is Sakthi active?" |
| `EMPLOYEE_LOCATION` | "Where does John work?" |
| `EMPLOYEE_LEAVE_BALANCE` | "How many leaves does Sakthi have?" *(admin/manager only)* |
| `GREETING` | "Hi", "Hello", "Good morning" |
| `HELP` | "help", "what can you do?" |

---

## 7. How to Run

```bash
# Terminal 1 — Node.js HRMS API
cd server && npm run dev

# Terminal 2 — FastAPI chatbot
cd hrms-chatbot
python -m venv .venv && .venv\Scripts\activate    # Windows
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# (One-time) Train sklearn intent model
python train_intent.py

# Start server
uvicorn app.main:app --reload --port 8000

# Terminal 3 — React frontend
cd client && npm run dev
```

Swagger UI: `http://localhost:8000/docs`  
Health check: `http://localhost:8000/health`

---

## 8. Debug Endpoints

Active only when `DEBUG=true` in `.env`:

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/debug/me` | Verify token and fetch own profile from Node.js |
| `GET /api/v1/debug/extract?text=...` | Test entity extraction live |
| `GET /api/v1/debug/leave-balance` | Test leave API connectivity |
| `GET /api/v1/debug/search?q=...` | Test employee search, shows terminated employees |
| `POST /api/v1/debug/cache/reset` | Force employee cache reload |
| `GET /api/v1/debug/cache-status` | Show cache size and terminated count |

---

## 9. How to Add a New Intent

1. **Add to enum** — `app/nlp/model_config.py`
2. **Add keyword rule** — `app/nlp/intent_classifier.py` (place before the generic catch-alls)
3. **Add handler** — `app/services/chatbot_service.py` (`_route` function)
4. **Add training examples** — `data/intent_dataset.json`
5. **Retrain** — `python train_intent.py`
6. Restart the server.

---

## 10. Key Design Decisions

| Decision | Reason |
|---|---|
| No direct DB writes from chatbot | Chatbot is read-only; all mutations go through Node.js business logic |
| Two-stage NLP (keyword + sklearn) | Keyword rules give instant 0.99 confidence for common queries; sklearn handles edge cases |
| Deterministic response templates | No hallucination risk — answers always sourced from DB |
| Same JWT as Node.js | No re-login; single auth system |
| Separate `_can_view_leave` guard | Leave balance is sensitive; isolating the check makes it easy to tighten independently |
| `MY_LEAVE_BALANCE` → re-route when entity present | Keyword rules match MY_LEAVE_BALANCE even when a name is in the query; entity presence re-routes to EMPLOYEE intent |
| Employee cache via direct DB | Node.js search API excludes some roles; direct DB covers all employees including terminated |
| HRMS_DB_URL from env | No hardcoded credentials; falls back to DB_* vars for parity with server/.env |
| asyncio.Lock double-check in cache | Prevents duplicate DB round-trips under concurrent requests |
| Typed error messages in widget | Auth expiry, permission, server error, and network failures each show specific guidance |
