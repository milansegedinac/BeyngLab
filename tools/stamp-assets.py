"""Stamp CSS/JS links in every page with a hash of the file they point to.

GitHub Pages lets browsers cache assets for 10 minutes, so after an update
returning visitors can get new HTML with stale CSS/JS. A ?v=<hash> query makes
each changed asset a new URL. Run after editing anything in assets/:

    python tools/stamp-assets.py
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINK = re.compile(r'((?:href|src)="((?:\.\./)*)assets/([\w.-]+\.(?:css|js)))(?:\?v=[0-9a-f]+)?"')


def digest(name, cache={}):
    if name not in cache:
        # Normalize line endings so a CRLF checkout yields the same stamp.
        data = (ROOT / "assets" / name).read_bytes().replace(b"\r\n", b"\n")
        cache[name] = hashlib.sha256(data).hexdigest()[:10]
    return cache[name]


changed = 0
for page in sorted(ROOT.rglob("*.html")):
    if ".git" in page.parts:
        continue
    text = page.read_text(encoding="utf-8")
    stamped = LINK.sub(lambda m: f'{m[1]}?v={digest(m[3])}"', text)
    if stamped != text:
        page.write_text(stamped, encoding="utf-8", newline="\n")
        changed += 1

print(f"stamped {changed} page(s)")
