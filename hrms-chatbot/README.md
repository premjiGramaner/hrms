# HRMS Chatbot API

A production-ready FastAPI chatbot for your HRMS system.

**Key principle:** Hugging Face determines *what* is being asked. The HRMS database determines *what* the answer is. The AI model never generates employee data.

## Architecture

```
User Message
     │
     ▼
FastAPI Route  (/api/v1/chat)
     │
     ▼
Chatbot Service
     ├── Intent Classifier  (Hugging Face zero-shot / fine-tuned)
     │       └── Returns: intent + confidence
     ├── Entity Extractor   (HF NER + deterministic regex)
     │       └── Returns: employee_name / employee_id / email
     ├── Session Context    (in-memory or Redis)
     │       └── Fills missing entities from prior turn
     ├── Employee Resolver  (PostgreSQL via SQLAlchemy)
     │       └── Finds exact / partial match, handles ambiguity
     ├── Permission Check   (role-based + object-level)
     │       └── Raises 403 if denied — logged to audit table
     ├── Field Accessor     (DB query — returns only allowed fields)
     └── Response Template  (deterministic — no AI generation)
```

## Roles & Permissions

| Role | Own Profile | Other Employees | Sensitive Fields |
|------|-------------|-----------------|-----------------|
| `employee` | ✓ | ✗ | ✗ |
| `supervisor` / `manager` | ✓ | ✓ (team) | ✗ |
| `empmanager` | ✓ | ✓ | ✗ |
| `hradmin` | ✓ | ✓ | ✓ |

## Quick Start

### 1. Clone & enter directory

```bash
cd hrms-chatbot
```

### 2. Create virtual environment

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / Mac
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # Linux/Mac
```

Edit `.env` — at minimum set:
```
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/hrms
JWT_SECRET_KEY=YOUR_SAME_SECRET_AS_NODE_SERVER
```

> The chatbot connects to the **same PostgreSQL database** as the existing Node.js HRMS server.
> Use the same `JWT_SECRET_KEY` so tokens from the existing login work here too.

### 5. Start the server

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

---

## API Reference

### Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{"username": "john.smith", "password": "yourpassword"}
```

Response:
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user_id": 1,
  "role": "employee"
}
```

### Chatbot

```http
POST /api/v1/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What is John Smith's email?",
  "session_id": "optional-session-id"
}
```

Response:
```json
{
  "intent": "EMPLOYEE_EMAIL",
  "confidence": 0.96,
  "entities": {"employee_name": "John Smith"},
  "answer": "John Smith's email is john.smith@example.com",
  "session_id": "sess_abc123"
}
```

### Employee CRUD

```http
GET    /api/v1/employees          # list (admin/supervisor roles)
GET    /api/v1/employees/me       # own profile
GET    /api/v1/employees/{id}     # single employee
POST   /api/v1/employees          # create (admin only)
PUT    /api/v1/employees/{id}     # update (admin only)
DELETE /api/v1/employees/{id}     # soft-delete (admin only)
```

---

## Supported Intents

| Intent | Example |
|--------|---------|
| `EMPLOYEE_PROFILE` | "Show me John Smith's profile" |
| `EMPLOYEE_EMAIL` | "What is John's email?" |
| `EMPLOYEE_PHONE` | "What is Alice's phone number?" |
| `EMPLOYEE_DEPARTMENT` | "Which department does Bob work in?" |
| `EMPLOYEE_DESIGNATION` | "What is John's job title?" |
| `EMPLOYEE_MANAGER` | "Who is Sarah's manager?" |
| `EMPLOYEE_JOINING_DATE` | "When did John join?" |
| `EMPLOYEE_STATUS` | "Is Alice still active?" |
| `EMPLOYEE_LOCATION` | "Where does Bob work?" |
| `MY_PROFILE` | "Show my profile" |
| `MY_EMAIL` | "What is my email?" |
| `MY_DEPARTMENT` | "What department am I in?" |
| `MY_DESIGNATION` | "What is my job title?" |
| `MY_MANAGER` | "Who is my manager?" |
| `MY_JOINING_DATE` | "When did I join?" |
| `MY_LEAVE_BALANCE` | "How many leaves do I have?" |

---

## NLP Model Configuration

### Zero-shot (default — no training required)

The default setup uses `cross-encoder/nli-distilroberta-base` for zero-shot classification. No training data required. Works out of the box but accuracy is ~0.80–0.85.

Set in `.env`:
```
HF_MODEL_NAME=cross-encoder/nli-distilroberta-base
FINE_TUNED_MODEL_PATH=
```

### Fine-tuned model (recommended for production)

Train on `data/intent_dataset.json` (120+ examples across 16 intents):

```python
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
import json

# Load dataset
data = json.load(open("data/intent_dataset.json"))
intents = sorted(set(d["intent"] for d in data))
label2id = {l: i for i, l in enumerate(intents)}

dataset = Dataset.from_list([
    {"text": d["text"], "label": label2id[d["intent"]]} for d in data
])

tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")

def tokenize(batch):
    return tokenizer(batch["text"], truncation=True, padding=True)

dataset = dataset.map(tokenize, batched=True)

model = AutoModelForSequenceClassification.from_pretrained(
    "distilbert-base-uncased",
    num_labels=len(intents),
    id2label={i: l for l, i in label2id.items()},
    label2id=label2id,
)

trainer = Trainer(
    model=model,
    train_dataset=dataset,
    args=TrainingArguments(output_dir="./fine_tuned_model", num_train_epochs=5),
)
trainer.train()
model.save_pretrained("./fine_tuned_model")
tokenizer.save_pretrained("./fine_tuned_model")
```

Then set in `.env`:
```
FINE_TUNED_MODEL_PATH=./fine_tuned_model
```

---

## Adding a New Intent

1. Add the intent to `app/nlp/model_config.py` in the `Intent` enum
2. Add training examples to `data/intent_dataset.json`
3. Add a handler branch in `app/services/chatbot_service.py` in `_route_intent()`
4. Re-train the fine-tuned model (if using one)

## Adding a New Employee Field

1. Add the column to `app/db/models.py` (SQLAlchemy model)
2. Add to `app/schemas/employee.py` (Pydantic schema)
3. Add field formatting in `app/services/chatbot_service.py` in `_format_field()`
4. Add permission rules in `app/core/permissions.py` if it's sensitive

---

## Running Tests

```bash
pytest
```

Tests use an in-memory SQLite database — no PostgreSQL needed.
NLP models are mocked so tests run without internet access.

---

## Audit Logging

Every chatbot data-access event is logged to `tbl_chatbot_audit_log`:

```json
{
  "user_id": 101,
  "action": "VIEW_EMPLOYEE_EMAIL",
  "target_employee_id": 205,
  "intent": "EMPLOYEE_EMAIL",
  "message_snippet": "What is John's email?",
  "timestamp": "2026-08-14T10:30:00Z"
}
```

Passwords, tokens, salary, and bank details are **never** logged.

---

## Conversation Context

The chatbot maintains a small session state to handle follow-up questions:

```
User: Show John Smith.
Bot:  John Smith is a Software Engineer in Engineering.

User: What is his email?        ← resolved from session, no entity needed
Bot:  John Smith's email is john.smith@example.com
```

Session state is stored in memory by default. Set `REDIS_URL` in `.env` to use Redis for persistence across restarts.

---

## Project Structure

```
hrms-chatbot/
├── app/
│   ├── main.py                  # FastAPI app, lifespan, routes
│   ├── api/routes/
│   │   ├── auth.py              # POST /auth/login, GET /auth/me
│   │   ├── employees.py         # Employee CRUD
│   │   └── chatbot.py           # POST /chat
│   ├── core/
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── security.py          # JWT, password hashing
│   │   └── permissions.py       # Role checks, field filtering
│   ├── db/
│   │   ├── database.py          # Async SQLAlchemy engine
│   │   └── models.py            # ORM models (tbl_appusers, audit log)
│   ├── schemas/
│   │   ├── auth.py              # Login / token schemas
│   │   ├── employee.py          # Employee response schemas
│   │   └── chatbot.py           # Chat request/response schemas
│   ├── services/
│   │   ├── chatbot_service.py   # Main orchestration pipeline
│   │   ├── employee_service.py  # DB queries, resolver, audit
│   │   ├── intent_service.py    # NLP intent wrapper
│   │   ├── entity_service.py    # NLP entity wrapper
│   │   └── session_service.py   # Conversation context
│   └── nlp/
│       ├── intent_classifier.py # Hugging Face pipeline wrapper
│       ├── entity_extractor.py  # NER + regex extractor
│       └── model_config.py      # Intent enum, labels
├── data/
│   └── intent_dataset.json      # 120+ labelled training examples
├── tests/
│   ├── conftest.py              # Fixtures, in-memory DB, mocks
│   ├── test_auth.py
│   ├── test_employees.py
│   └── test_chatbot.py
├── requirements.txt
├── .env.example
├── pytest.ini
└── README.md
```
