#!/usr/bin/env python3
"""Validate every fixture against the frozen JSON schemas.

    python contracts/validate.py

Run this after any contract change. It is the cheapest test in the repo, and it catches the
failure mode that costs hackathon teams hours: one person renames a field, the other two find
out at 3am when nothing deserialises.

Beyond schema validation it enforces the two invariants that matter most:
  rule 1 - no Signal may carry an action
  rule 2 - risk_score and confidence stay separate and in range
"""

import json
import pathlib
import sys

try:
    from jsonschema import Draft202012Validator
except ImportError:
    sys.exit("jsonschema not installed.  pip install jsonschema")

ROOT = pathlib.Path(__file__).parent
SCHEMAS = ROOT / "json"
FIXTURES = ROOT / "fixtures"

# Fields that must never appear on a Signal. See rule 1 in the root README.
FORBIDDEN_ON_SIGNAL = {"action", "recommendation", "decision", "recommended_action", "verdict"}

failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)
    print(f"  FAIL  {msg}")


def load(p: pathlib.Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        fail(f"{p.name} is not valid JSON: {e}")
        return None


def main() -> int:
    schemas = {}
    print("schemas")
    for path in sorted(SCHEMAS.glob("*.schema.json")):
        doc = load(path)
        if doc is None:
            continue
        try:
            Draft202012Validator.check_schema(doc)
        except Exception as e:
            fail(f"{path.name} is not a valid schema: {e}")
            continue
        schemas[path.name.replace(".schema.json", "")] = Draft202012Validator(doc)
        print(f"  ok    {path.name}")

    if not schemas:
        return 1

    print("\nfixtures")
    for path in sorted(FIXTURES.glob("*.json")):
        fx = load(path)
        if fx is None:
            continue
        sid = fx.get("scenario_id", path.stem)

        for sig in fx.get("signals", []):
            leaked = FORBIDDEN_ON_SIGNAL & set(sig)
            if leaked:
                fail(
                    f"{sid}: Signal carries {sorted(leaked)} - models emit evidence, "
                    f"never decisions (rule 1)"
                )
            for err in schemas["signal"].iter_errors(sig):
                fail(f"{sid} signal: {err.message}")

        for ev in fx.get("evidence", []):
            for err in schemas["evidence"].iter_errors(ev):
                fail(f"{sid} evidence {ev.get('evidence_id','?')}: {err.message}")

        if (a := fx.get("assessment")):
            for err in schemas["assessment"].iter_errors(a):
                fail(f"{sid} assessment: {err.message}")
            # Cross-check: every evidence_ids entry actually exists in the fixture.
            known = {e["evidence_id"] for e in fx.get("evidence", [])}
            for ref in a.get("evidence_ids", []):
                if ref not in known:
                    fail(f"{sid} assessment references unknown evidence {ref}")

        if (d := fx.get("decision")):
            for err in schemas["decision"].iter_errors(d):
                fail(f"{sid} decision: {err.message}")
            if d.get("action") != fx.get("expected_action"):
                fail(
                    f"{sid}: decision action {d.get('action')!r} does not match "
                    f"expected_action {fx.get('expected_action')!r}"
                )
            # Every rationale ref must be a real evidence id or a rule.* id.
            known = {e["evidence_id"] for e in fx.get("evidence", [])}
            for ref in d.get("rationale_refs", []):
                if not ref.startswith("rule.") and ref not in known:
                    fail(f"{sid} decision cites unknown rationale {ref}")

        if not failures:
            print(f"  ok    {path.name}  ({sid} -> {fx.get('expected_action')})")

    print()
    if failures:
        print(f"{len(failures)} problem(s). Contracts are frozen - fix the fixture, "
              f"or agree the change with all three owners first.")
        return 1
    print("All contracts and fixtures valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
