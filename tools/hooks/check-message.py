#!/usr/bin/env python3
"""Refuse a commit message that claims an author this project does not have.

Self-contained on purpose: this repository is public and must not depend on
anything in the private workshop to enforce its own rule.
"""

import re
import sys

BANNED = (
    (re.compile(r"^[ \t]*Co-[Aa]uthored-[Bb]y:", re.M),
     "a Co-Authored-By trailer"),
    (re.compile(r"Generated with \[Claude Code\]|🤖 Generated with"),
     "an assistant attribution line"),
)

if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as fh:
        message = fh.read()
    for pattern, what in BANNED:
        if pattern.search(message):
            print(f"refused: the message carries {what}. Every commit here is "
                  f"authored by witzman alone.", file=sys.stderr)
            sys.exit(1)
