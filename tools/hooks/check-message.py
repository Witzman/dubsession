#!/usr/bin/env python3
"""Refuse a commit message that claims an author this project does not have,
or that is a report where a subject line belongs.

Self-contained on purpose: this repository is public and must not depend on
anything in the private workshop to enforce its own rules. The length limits
are kept identical to the workshop's `bin/lib.py` by hand, and the workshop's
test suite is where they are proved.
"""

import re
import sys

BANNED = (
    (re.compile(r"^[ \t]*Co-[Aa]uthored-[Bb]y:", re.M),
     "a Co-Authored-By trailer"),
    (re.compile(r"Generated with \[Claude Code\]|🤖 Generated with"),
     "an assistant attribution line"),
)

SUBJECT_MAX = 72
MESSAGE_MAX = 800

# `#` AND THEN A SPACE, OR `#` ALONE. Not any line starting with a hash: every
# subject in this project is `#58: …`, and stripping on a bare `#` throws the
# subject away and measures the body as the subject.
COMMENT = re.compile(r"^#(\s|$)")
# A merge or a revert carries a message git wrote, or the whole of the commit
# being undone. Neither is a session being verbose.
GENERATED = re.compile(r"^(Merge |Revert |fixup! |squash! )")


def length_offence(message):
    """The line to refuse an over-long commit message with, or ""."""
    body = "\n".join(l for l in message.split("\n") if not COMMENT.match(l)).strip()
    if not body or GENERATED.match(body):
        return ""
    subject = body.split("\n", 1)[0]
    if len(subject) > SUBJECT_MAX:
        return ("refused: the subject is %d characters and the limit is %d. A "
                "commit subject is a line, not a paragraph." % (len(subject), SUBJECT_MAX))
    if len(body) > MESSAGE_MAX:
        return ("refused: the message is %d characters and the limit is %d. "
                "`git log` is read again by everyone who comes after; the "
                "detail belongs on the issue." % (len(body), MESSAGE_MAX))
    return ""


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as fh:
        message = fh.read()
    for pattern, what in BANNED:
        if pattern.search(message):
            print(f"refused: the message carries {what}. Every commit here is "
                  f"authored by witzman alone.", file=sys.stderr)
            sys.exit(1)
    offence = length_offence(message)
    if offence:
        print(offence, file=sys.stderr)
        sys.exit(1)
