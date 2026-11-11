#!/usr/bin/env python3
"""
clean_greek_words.py — Καθαρίζει ελληνικό wordlist και βγάζει valid-words.txt
με μόνο 5γραμμες ελληνικές λέξεις, κεφαλαία, χωρίς τόνους.

Χρήση:
    python clean_greek_words.py input.txt
    python clean_greek_words.py input.txt -o valid-words.txt --stats
    python clean_greek_words.py input.txt --keep-existing valid-words.txt
"""

import argparse
import re
import sys
import unicodedata
from pathlib import Path

# Μόνο κεφαλαία ελληνικά (χωρίς τελικό σίγμα, το κανονικοποιούμε σε Σ)
GREEK_LETTERS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"
WORD_RE = re.compile(rf"^[{GREEK_LETTERS}]{{5}}$")


def normalize(word: str) -> str:
    """Uppercase, χωρίς τόνους/διαλυτικά, τελικό ς → Σ."""
    word = unicodedata.normalize("NFD", word)
    word = "".join(ch for ch in word if not unicodedata.combining(ch))
    word = word.upper().replace("Ϊ", "Ι").replace("Ϋ", "Υ")
    word = word.replace("ς", "Σ")
    return word.strip()


def load_words(path: Path) -> list[str]:
    raw = path.read_text(encoding="utf-8-sig", errors="replace")
    words = []
    for line in raw.splitlines():
        # Κρατάμε μόνο το πρώτο token (αν έχει tabs/στηλα όπως freq, pos, κλπ.)
        token = line.strip().replace("\t", " ").split(" ")[0].strip()
        if token:
            words.append(normalize(token))
    return words


def clean(words: list[str], keep_existing: Path | None) -> list[str]:
    cleaned: set[str] = set()
    for w in words:
        if WORD_RE.match(w):
            cleaned.add(w)
    if keep_existing and keep_existing.exists():
        for w in keep_existing.read_text(encoding="utf-8-sig").splitlines():
            w = normalize(w)
            if WORD_RE.match(w):
                cleaned.add(w)
    return sorted(cleaned)


def main() -> None:
    ap = argparse.ArgumentParser(description="Καθαρίζει ελληνικό wordlist → 5γραμμες λέξεις.")
    ap.add_argument("input", type=Path, help="Αρχείο εισόδου (μία λέξη ανά γραμμή ή με στήλες)")
    ap.add_argument("-o", "--output", type=Path, default=Path("valid-words.txt"))
    ap.add_argument("--keep-existing", type=Path, default=None,
                    help="Αν υπάρχει, κρατάει τις λέξεις του και προσθέτει τις νέες")
    ap.add_argument("--stats", action="store_true", help="Δείξε στατιστικά")
    args = ap.parse_args()

    if not args.input.exists():
        sys.exit(f"❌ Δεν βρέθηκε: {args.input}")

    raw = load_words(args.input)
    final = clean(raw, args.keep_existing)
    args.output.write_text("\n".join(final) + "\n", encoding="utf-8")

    print(f"✅ Γράφτηκαν {len(final)} λέξεις στο {args.output}")
    if args.stats:
        print(f"   Από {len(raw)} αρχικές γραμμές")
        print(f"   Ποσοστό διατήρησης: {100 * len(final) / max(len(raw), 1):.1f}%")


if __name__ == "__main__":
    main()
