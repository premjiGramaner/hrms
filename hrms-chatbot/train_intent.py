"""
Train scikit-learn intent classifier on data/intent_dataset.json.

Run once:
    python train_intent.py

Output:
    models/intent_sklearn.pkl   (TF-IDF + LogisticRegression pipeline)

Then set in .env:
    SKLEARN_MODEL_PATH=models/intent_sklearn.pkl
"""

import json
import os
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
import joblib

# ── Load dataset ──────────────────────────────────────────────────────────────
data_path = Path("data/intent_dataset.json")
data = json.loads(data_path.read_text(encoding="utf-8"))

texts   = [d["text"] for d in data]
intents = [d["intent"] for d in data]

print(f"Dataset: {len(texts)} examples across {len(set(intents))} intents")

# ── Build pipeline ────────────────────────────────────────────────────────────
model = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 3),      # unigrams, bigrams, trigrams
        min_df=1,
        analyzer="word",
        sublinear_tf=True,       # apply log normalization
    )),
    ("clf", LogisticRegression(
        max_iter=1000,
        C=5.0,
        solver="lbfgs",
    )),
])

# ── Cross-validation ──────────────────────────────────────────────────────────
print("\nCross-validation (5-fold)...")
scores = cross_val_score(model, texts, intents, cv=5, scoring="accuracy")
print(f"Accuracy: {scores.mean():.1%} ± {scores.std():.1%}")

# ── Train on full dataset ─────────────────────────────────────────────────────
model.fit(texts, intents)

# ── Quick sanity check ────────────────────────────────────────────────────────
print("\nSanity check:")
test_cases = [
    ("What is John's email?",                 "EMPLOYEE_EMAIL"),
    ("show my profile",                       "MY_PROFILE"),
    ("How many leaves does sakthi have?",     "EMPLOYEE_LEAVE_BALANCE"),
    ("Who is my manager?",                    "MY_MANAGER"),
    ("What department does alice work in?",   "EMPLOYEE_DEPARTMENT"),
    ("What is my mobile number?",             "MY_PHONE"),
    ("When did prashanth join?",              "EMPLOYEE_JOINING_DATE"),
]

all_pass = True
for text, expected in test_cases:
    predicted = model.predict([text])[0]
    confidence = model.predict_proba([text])[0].max()
    mark = "✓" if predicted == expected else "✗"
    if predicted != expected:
        all_pass = False
    print(f"  {mark} {predicted:<30} ({confidence:.2f})  {text}")

# ── Save model ────────────────────────────────────────────────────────────────
out_dir = Path("models")
out_dir.mkdir(exist_ok=True)
out_path = out_dir / "intent_sklearn.pkl"
joblib.dump(model, out_path)
print(f"\n{'✓' if all_pass else '⚠'} Model saved → {out_path}")
print("\nSet in .env:  SKLEARN_MODEL_PATH=models/intent_sklearn.pkl")
