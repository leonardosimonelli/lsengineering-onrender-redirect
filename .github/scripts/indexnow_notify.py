#!/usr/bin/env python3
"""Notify IndexNow about changed canonical HTML pages after a deployed site update."""
from __future__ import annotations
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

HOST = "lsengineering-web.onrender.com"
BASE = "https://" + HOST
KEY = (Path("site") / "2a94be109fd6f543cda6747ce66bd8a8.txt").read_text().strip()
assert re.fullmatch(r"[A-Za-z0-9-]{8,128}", KEY)
ROOT = ET.parse("site/sitemap.xml").getroot()
sitemap = {x.text for x in ROOT.iter() if x.tag.endswith("}loc") or x.tag == "loc"}
sitemap = {x for x in sitemap if x and x.startswith(BASE + "/")}
manual = os.getenv("GITHUB_EVENT_NAME") == "workflow_dispatch"
if manual:
    urls = sorted(sitemap)
else:
    before = os.getenv("GITHUB_EVENT_BEFORE", "")
    if not re.fullmatch(r"[0-9a-f]{40}", before) or before == "0" * 40:
        print("No usable preceding commit; no automatic notifications.")
        raise SystemExit(0)
    files = subprocess.check_output(
        ["git", "diff", "--name-only", before, "HEAD", "--", "site"],
        text=True,
    ).splitlines()
    urls = []
    for f in files:
        if not (f.startswith("site/") and f.endswith(".html")):
            continue
        short = f[len("site/") :]
        path = "/" if short == "index.html" else (
            "/" + short[:-len("index.html")] if short.endswith("/index.html")
            else "/" + short
        )
        url = BASE + path
        if url in sitemap:
            urls.append(url)
    urls = sorted(set(urls))
if not urls:
    print("No added or modified canonical HTML pages to notify.")
    raise SystemExit(0)
print("Changed canonical URLs:", len(urls))
# Do not notify before the static deploy actually serves the changed pages.
for attempt in range(7):
    missing = []
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LS-IndexNow/1.0"})
            with urllib.request.urlopen(req, timeout=12) as r:
                if r.status != 200:
                    missing.append(url)
        except Exception:
            missing.append(url)
    if not missing:
        break
    if attempt == 6:
        raise SystemExit("Static deploy not ready: " + ", ".join(missing))
    print("Static site still deploying:", len(missing), "URLs. Waiting...")
    time.sleep(20)
payload = json.dumps({"host": HOST, "key": KEY, "urlList": urls}).encode("utf-8")
req = urllib.request.Request(
    "https://api.indexnow.org/indexnow", payload,
    {"Content-Type": "application/json; charset=utf-8", "User-Agent": "LS-IndexNow/1.0"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=25) as r:
        code = r.status
except urllib.error.HTTPError as e:
    code = e.code
print("IndexNow response:", code, "URL count:", len(urls))
if code not in (200, 202):
    raise SystemExit("IndexNow did not accept this notification.")
