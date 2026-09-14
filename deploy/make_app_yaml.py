"""Generate the real app.yaml from app.yaml.example + api/.env. Never commit the output.

    python deploy/make_app_yaml.py            # writes ./app.yaml (gitignored)
    gcloud app deploy app.yaml --project ledgersentinel-hq

Secrets live in api/.env and nowhere else. This copies them into env_variables for the one
deploy, which is the only way App Engine Standard takes configuration without Secret Manager
(and Secret Manager wants a billing account). The file it writes is in .gitignore; check
`git status` shows no app.yaml before you push anything.
"""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXAMPLE = ROOT / "app.yaml.example"
ENV = ROOT / "api" / ".env"
OUT = ROOT / "app.yaml"

# Keys copied from api/.env. Anything else in .env stays local.
COPY = (
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_KEY",
    "PRISMTRACE_API_KEY",
    "PRISMTRACE_PROJECT_ID",
    "PRISMTRACE_HOST",
)


def main() -> int:
    if not ENV.exists():
        sys.exit(f"{ENV} not found - the deploy needs the real keys")
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

    text = EXAMPLE.read_text(encoding="utf-8")
    missing = []
    for key in COPY:
        val = env.get(key, "")
        if not val:
            missing.append(key)
        # Replace the example's empty/placeholder value for this key, quoted for YAML.
        text, n = re.subn(rf'^(\s*{key}:\s*)"[^"]*"', rf'\g<1>"{val}"', text, flags=re.M)
        if n != 1:
            sys.exit(f"app.yaml.example has no line for {key}")
    if missing:
        sys.exit(f"api/.env is missing: {', '.join(missing)}")

    text = text.replace(
        "# App Engine Standard config for the API. This file is the SHAPE only.",
        "# GENERATED from app.yaml.example + api/.env by deploy/make_app_yaml.py. CONTAINS SECRETS. GITIGNORED.",
    )
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} ({len(COPY)} secrets filled). It is gitignored - verify with `git status`.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
