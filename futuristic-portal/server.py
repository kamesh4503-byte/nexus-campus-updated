"""Nexus Campus server — static portal + lightweight persistent APIs.

Run locally:
    python server.py
Open:
    http://localhost:5500

The login demo intentionally does not store usernames or passwords. Admin-managed
portal content is stored in data/portal_data.json. PDF text extraction uses pypdf.
"""
import datetime
import http.server
import json
import os
import re
import threading
import urllib.parse
from collections import Counter

try:
    from pypdf import PdfReader
except Exception:  # site still runs; PDF AI reports a helpful error
    PdfReader = None

PORT = int(os.environ.get("PORT", 5500))
ROOT = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(ROOT, "login_log.txt")
COUNT_FILE = os.path.join(ROOT, "login_count.txt")
PDF_DIR = os.path.join(ROOT, "pdfs")
DATA_DIR = os.path.join(ROOT, "data")
DATA_FILE = os.path.join(DATA_DIR, "portal_data.json")
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "nexus-admin-2026")
DATA_LOCK = threading.Lock()

DEFAULT_DATA = {
    "attendance": {
        "percentage": 86,
        "records": [
            {"date": "2026-08-01", "status": "present"}, {"date": "2026-08-02", "status": "present"},
            {"date": "2026-08-03", "status": "present"}, {"date": "2026-08-04", "status": "absent"},
            {"date": "2026-08-05", "status": "present"}, {"date": "2026-08-06", "status": "present"},
            {"date": "2026-08-07", "status": "present"}, {"date": "2026-08-08", "status": "present"},
            {"date": "2026-08-09", "status": "present"}, {"date": "2026-08-10", "status": "present"},
            {"date": "2026-08-11", "status": "absent"}, {"date": "2026-08-12", "status": "present"},
            {"date": "2026-08-13", "status": "present"}, {"date": "2026-08-14", "status": "present"},
            {"date": "2026-08-15", "status": "present"}, {"date": "2026-08-16", "status": "present"},
            {"date": "2026-08-17", "status": "present"}, {"date": "2026-08-18", "status": "absent"},
            {"date": "2026-08-19", "status": "present"}, {"date": "2026-08-20", "status": "present"},
            {"date": "2026-08-21", "status": "present"}, {"date": "2026-08-22", "status": "present"}
        ]
    },
    "assignments": [
        {"id": "a1", "title": "C Programming — Looping Statements", "subject": "C Programming", "due_date": "2026-08-24", "status": "pending"},
        {"id": "a2", "title": "Numerical Methods Worksheet", "subject": "Mathematics", "due_date": "2026-08-26", "status": "pending"},
        {"id": "a3", "title": "English Communication Activity", "subject": "English", "due_date": "2026-08-28", "status": "pending"},
        {"id": "a4", "title": "Linux Lab Record", "subject": "Linux Lab", "due_date": "2026-08-20", "status": "submitted"}
    ],
    "timetable": {
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "periods": ["9:00", "10:00", "11:00", "12:00", "2:00", "3:00"],
        "grid": [
            ["C Programming", "Mathematics", "English", "Lunch", "Linux Lab", "Tamil"],
            ["Mathematics", "C Programming", "Tamil", "Lunch", "English", "Lab"],
            ["English", "Tamil", "C Programming", "Lunch", "Mathematics", "Lab"],
            ["Linux Lab", "English", "Mathematics", "Lunch", "C Programming", "Tamil"],
            ["Lab", "Lab", "Tamil", "Lunch", "C Programming", "Mathematics"]
        ]
    },
    "announcements": [
        {"id": "n1", "title": "AI Hackathon Registration", "body": "Team registration closes soon. Check your department notice for final reporting instructions.", "level": "important", "date": "2026-08-22"},
        {"id": "n2", "title": "Library PDF Hub Updated", "body": "New study PDFs can now be opened and analyzed using Nexus AI Study Mode.", "level": "info", "date": "2026-08-21"}
    ],
    "events": [
        {"id": "e1", "title": "AI Hackathon", "date": "2026-08-29", "time": "16:00", "type": "event", "location": "Campus Lab Block"},
        {"id": "e2", "title": "C Programming Internal Test", "date": "2026-08-27", "time": "14:00", "type": "exam", "location": "Classroom"}
    ],
    "profile": {
        "name": "Test Student", "roll_no": "TEST-000", "department": "B.Sc. Computer Science",
        "semester": "Semester 1", "section": "A", "email": "student@nexus.local",
        "phone": "", "bio": "Building skills one class at a time.", "avatar": "N"
    }
}


def deep_copy_default():
    return json.loads(json.dumps(DEFAULT_DATA))


def ensure_data_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(PDF_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_DATA, f, indent=2)


def load_data():
    ensure_data_file()
    with DATA_LOCK:
        try:
            with open(DATA_FILE, encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = deep_copy_default()
        changed = False
        for key, value in DEFAULT_DATA.items():
            if key not in data:
                data[key] = json.loads(json.dumps(value))
                changed = True
        if changed:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        return data


def save_data(data):
    ensure_data_file()
    with DATA_LOCK:
        temp = DATA_FILE + ".tmp"
        with open(temp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp, DATA_FILE)


def parse_multipart(body: bytes, boundary: str):
    boundary_bytes = ("--" + boundary).encode()
    fields, file_part = {}, None
    for raw_part in body.split(boundary_bytes):
        part = raw_part.strip(b"\r\n")
        if not part or part == b"--" or b"\r\n\r\n" not in part:
            continue
        header_bytes, content = part.split(b"\r\n\r\n", 1)
        content = content[:-2] if content.endswith(b"\r\n") else content
        headers = header_bytes.decode(errors="replace")
        name_match = re.search(r'(?<!file)name="([^"]*)"', headers, re.IGNORECASE)
        filename_match = re.search(r'filename="([^"]*)"', headers, re.IGNORECASE)
        if not name_match:
            continue
        field_name = name_match.group(1)
        if filename_match and filename_match.group(1):
            file_part = (filename_match.group(1), content)
        else:
            fields[field_name] = content.decode(errors="replace")
    return fields, file_part


def bump_login_count():
    count = 0
    if os.path.exists(COUNT_FILE):
        try:
            count = int(open(COUNT_FILE, encoding="utf-8").read().strip() or "0")
        except Exception:
            pass
    count += 1
    with open(COUNT_FILE, "w", encoding="utf-8") as f:
        f.write(str(count))
    return count


def safe_pdf_path(name):
    name = os.path.basename(urllib.parse.unquote(name or ""))
    if not name.lower().endswith(".pdf"):
        return None
    path = os.path.abspath(os.path.join(PDF_DIR, name))
    if not path.startswith(os.path.abspath(PDF_DIR) + os.sep):
        return None
    return path


def extract_pdf_text(path):
    if PdfReader is None:
        raise RuntimeError("PDF AI requires pypdf. Run: pip install -r requirements.txt")
    reader = PdfReader(path)
    pages = []
    for page in reader.pages[:80]:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    text = "\n".join(pages)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text[:160000]


STOP_WORDS = set("a an and are as at be been being but by can could did do does for from had has have he her hers him his how i if in into is it its may might more most must my no not of on or our ours she should so some such than that the their theirs them then there these they this those to too up us very was we were what when where which who will with would you your yours".split())


def sentences(text):
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    return [p.strip() for p in parts if 35 <= len(p.strip()) <= 600]


def top_keywords(text, limit=12):
    words = re.findall(r"[A-Za-z][A-Za-z0-9_-]{3,}", text.lower())
    freq = Counter(w for w in words if w not in STOP_WORDS and not w.isdigit())
    return [w for w, _ in freq.most_common(limit)]


def summarize_text(text, limit=6):
    sents = sentences(text)
    if not sents:
        return "I couldn't find enough selectable text in this PDF. It may be a scanned/image-only document."
    keys = set(top_keywords(text, 24))
    scored = []
    for idx, sent in enumerate(sents):
        words = set(re.findall(r"[A-Za-z][A-Za-z0-9_-]{3,}", sent.lower()))
        score = len(words & keys) / max(1, len(words))
        if idx < 3:
            score += 0.03
        scored.append((score, idx, sent))
    chosen = sorted(scored, reverse=True)[:limit]
    chosen = [s for _, i, s in sorted(chosen, key=lambda x: x[1])]
    return "\n\n".join(f"• {s}" for s in chosen)


def ask_text(text, query):
    qwords = set(re.findall(r"[A-Za-z][A-Za-z0-9_-]{2,}", (query or "").lower())) - STOP_WORDS
    sents = sentences(text)
    if not qwords:
        return summarize_text(text, 4)
    scored = []
    for sent in sents:
        words = set(re.findall(r"[A-Za-z][A-Za-z0-9_-]{2,}", sent.lower()))
        overlap = len(words & qwords)
        if overlap:
            scored.append((overlap / max(1, len(qwords)), sent))
    if not scored:
        return "I couldn't find a strong match for that question in the extracted PDF text. Try a more specific keyword from the document."
    best = [s for _, s in sorted(scored, reverse=True)[:4]]
    return "Closest matches in the PDF:\n\n" + "\n\n".join(f"• {s}" for s in best)


def pdf_study_result(text, action, query=""):
    keys = top_keywords(text, 14)
    sents = sentences(text)
    if action == "summary":
        return {"title": "Smart Summary", "content": summarize_text(text)}
    if action == "questions":
        qs = [f"Explain the role or meaning of “{k.title()}” in this document." for k in keys[:8]]
        return {"title": "Important Questions", "items": qs}
    if action == "flashcards":
        cards = []
        for k in keys[:8]:
            context = next((s for s in sents if re.search(rf"\b{re.escape(k)}\b", s, re.I)), "Review how this term is used in the document.")
            cards.append({"front": k.title(), "back": context[:360]})
        return {"title": "Flashcards", "cards": cards}
    if action == "quiz":
        items = []
        candidates = keys[:10]
        for k in candidates[:5]:
            context = next((s for s in sents if re.search(rf"\b{re.escape(k)}\b", s, re.I)), "")
            if not context:
                continue
            masked = re.sub(rf"\b{re.escape(k)}\b", "_____", context, count=1, flags=re.I)
            distractors = [x.title() for x in candidates if x != k][:3]
            options = [k.title()] + distractors
            items.append({"question": f"Fill the key term: {masked[:260]}", "answer": k.title(), "options": options})
        return {"title": "Quick Quiz", "quiz": items}
    if action == "ask":
        return {"title": "Ask this PDF", "content": ask_text(text, query)}
    return {"title": "PDF Study", "content": summarize_text(text, 4)}


def portal_ai_reply(message):
    data = load_data()
    msg = (message or "").strip()
    low = msg.lower()
    attendance = data["attendance"]["percentage"]
    pending = [a for a in data["assignments"] if a.get("status") != "submitted"]
    announcements = data["announcements"]

    if not msg:
        return "Ask me about attendance, assignments, your timetable, campus announcements, or a study topic."
    if "attendance" in low or "miss" in low or "75%" in low:
        margin = max(0, attendance - 75)
        return f"Your current attendance is {attendance}%. That's {margin} percentage points above the 75% requirement. Keep attending consistently; the Attendance page shows the detailed record."
    if "assignment" in low or "due" in low or "task" in low:
        if not pending:
            return "You have no pending assignments right now."
        upcoming = sorted(pending, key=lambda x: x.get("due_date", "9999"))[:3]
        lines = [f"• {a['title']} — due {a['due_date']}" for a in upcoming]
        return "Your next actionable assignments are:\n" + "\n".join(lines)
    if "tomorrow" in low or "timetable" in low or "schedule" in low or "class" in low:
        tt = data["timetable"]
        now = datetime.datetime.now()
        target = now + datetime.timedelta(days=1 if "tomorrow" in low else 0)
        day = target.strftime("%a")
        if day not in tt["days"]:
            return f"{day} has no regular classes in the current timetable. Check Calendar for campus events."
        idx = tt["days"].index(day)
        items = [f"{t} — {s}" for t, s in zip(tt["periods"], tt["grid"][idx]) if s != "Lunch"]
        return f"{day}'s timetable:\n" + "\n".join(f"• {x}" for x in items)
    if "announcement" in low or "notice" in low:
        latest = announcements[:3]
        return "Latest campus notices:\n" + "\n".join(f"• {n['title']}: {n['body']}" for n in latest)
    if "recursion" in low:
        return "Recursion is when a function calls itself to solve a smaller version of the same problem. A safe recursive function needs a base case to stop and a recursive case that moves toward that base case."
    if "loop" in low:
        return "In C, loops repeat a block of code. Use for when the iteration count is known, while when repetition depends on a condition, and do-while when the body must execute at least once."
    if "structure" in low and "union" in low:
        return "A structure gives separate memory to each member, while a union shares the same memory area among its members. So all structure members can hold values at once; in a union, normally only the most recently written member is meaningful."
    if "study" in low or "plan" in low or "revise" in low:
        return "A simple plan: 1) pick the nearest deadline, 2) study one focused topic for 25 minutes, 3) test yourself without notes, 4) review mistakes, and 5) finish with a 5-minute recap. Use Notes → AI Study Mode to turn PDFs into questions and flashcards."
    return "I can use your portal context for attendance, assignments, timetable, announcements and PDF study. For this question, try naming the subject or asking something like “what is due next?”, “tomorrow timetable”, or “explain recursion simply”."


def make_notifications(data):
    today = datetime.date.today()
    notices = []
    for a in data["assignments"]:
        if a.get("status") == "submitted":
            continue
        try:
            due = datetime.date.fromisoformat(a["due_date"])
            delta = (due - today).days
        except Exception:
            continue
        if delta < 0:
            text = f"{a['title']} is overdue."
            level = "danger"
        elif delta == 0:
            text = f"{a['title']} is due today."
            level = "important"
        elif delta <= 3:
            text = f"{a['title']} is due in {delta} day{'s' if delta != 1 else ''}."
            level = "important"
        else:
            continue
        notices.append({"id": "task-" + str(a["id"]), "title": "Assignment", "text": text, "level": level})
    for n in data["announcements"][:4]:
        notices.append({"id": "ann-" + str(n["id"]), "title": n["title"], "text": n["body"], "level": n.get("level", "info")})
    upcoming = []
    for e in data["events"]:
        try:
            d = datetime.date.fromisoformat(e["date"])
            delta = (d - today).days
        except Exception:
            continue
        if 0 <= delta <= 7:
            upcoming.append((delta, e))
    for delta, e in sorted(upcoming)[:3]:
        when = "today" if delta == 0 else f"in {delta} day{'s' if delta != 1 else ''}"
        notices.append({"id": "event-" + str(e["id"]), "title": e["title"], "text": f"Campus event {when} · {e.get('time','')} {e.get('location','')}", "level": "info"})
    return notices[:10]


class Handler(http.server.SimpleHTTPRequestHandler):
    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            return json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return {}

    def _admin_ok(self, payload=None, query=None):
        payload = payload or {}
        query = query or {}
        supplied = payload.get("password") or (query.get("password") or [""])[0]
        return supplied == ADMIN_PASSWORD

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)
        data = load_data()

        if path == "/api/pdfs":
            files = []
            os.makedirs(PDF_DIR, exist_ok=True)
            for name in sorted(os.listdir(PDF_DIR)):
                if name.lower().endswith(".pdf"):
                    size = os.path.getsize(os.path.join(PDF_DIR, name))
                    files.append({"name": name, "url": f"/pdfs/{urllib.parse.quote(name)}", "size": size})
            return self._send_json({"files": files})

        if path == "/api/pdf-text":
            pdf_path = safe_pdf_path((qs.get("name") or [""])[0])
            if not pdf_path or not os.path.isfile(pdf_path):
                return self._send_json({"error": "PDF not found"}, 404)
            try:
                text = extract_pdf_text(pdf_path)
                return self._send_json({"name": os.path.basename(pdf_path), "characters": len(text), "text": text[:12000]})
            except Exception as e:
                return self._send_json({"error": str(e)}, 500)

        if path == "/api/attendance":
            return self._send_json(data["attendance"])
        if path == "/api/assignments":
            return self._send_json(data["assignments"])
        if path == "/api/timetable":
            return self._send_json(data["timetable"])
        if path == "/api/announcements":
            return self._send_json(data["announcements"])
        if path == "/api/events":
            return self._send_json(data["events"])
        if path == "/api/profile":
            return self._send_json(data["profile"])
        if path == "/api/notifications":
            return self._send_json({"items": make_notifications(data)})

        if path == "/api/admin/logins":
            if not self._admin_ok(query=qs):
                return self._send_json({"error": "Invalid password"}, 401)
            entries, by_day = [], {}
            if os.path.exists(LOG_FILE):
                with open(LOG_FILE, encoding="utf-8") as f:
                    for line in f:
                        parts = [p.strip() for p in line.strip().split("|")]
                        if len(parts) < 3:
                            continue
                        timestamp = parts[0]
                        ip = parts[1].replace("ip=", "")
                        entries.append({"timestamp": timestamp, "ip": ip})
                        day = timestamp[:10]
                        by_day[day] = by_day.get(day, 0) + 1
            total = 0
            if os.path.exists(COUNT_FILE):
                try:
                    total = int(open(COUNT_FILE, encoding="utf-8").read().strip() or "0")
                except Exception:
                    pass
            return self._send_json({"total": total, "by_day": by_day, "entries": entries[-100:]})

        if path == "/api/admin/data":
            if not self._admin_ok(query=qs):
                return self._send_json({"error": "Invalid password"}, 401)
            return self._send_json(data)

        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path

        if path == "/api/admin/upload-pdf":
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type or "boundary=" not in content_type:
                return self._send_json({"error": "Expected multipart/form-data"}, 400)
            length = int(self.headers.get("Content-Length", 0))
            if length <= 0:
                return self._send_json({"error": "Empty request"}, 400)
            if length > MAX_UPLOAD_BYTES:
                return self._send_json({"error": "File too large (25MB max)"}, 413)
            boundary = content_type.split("boundary=", 1)[1].strip().strip('"')
            fields, file_part = parse_multipart(self.rfile.read(length), boundary)
            if fields.get("password") != ADMIN_PASSWORD:
                return self._send_json({"error": "Invalid admin password"}, 401)
            if not file_part:
                return self._send_json({"error": "No file received"}, 400)
            filename, content = file_part
            filename = os.path.basename(filename).strip()
            if not filename.lower().endswith(".pdf"):
                return self._send_json({"error": "Only .pdf files are allowed"}, 400)
            safe_name = re.sub(r"[^A-Za-z0-9._\- ]", "_", filename) or "upload.pdf"
            os.makedirs(PDF_DIR, exist_ok=True)
            base, ext = os.path.splitext(safe_name)
            target, counter = os.path.join(PDF_DIR, safe_name), 1
            while os.path.exists(target):
                target = os.path.join(PDF_DIR, f"{base} ({counter}){ext}")
                counter += 1
            with open(target, "wb") as f:
                f.write(content)
            final_name = os.path.basename(target)
            return self._send_json({"status": "uploaded", "name": final_name, "url": f"/pdfs/{urllib.parse.quote(final_name)}"})

        payload = self._read_json()

        if path == "/api/login":
            username = str(payload.get("username", ""))[:200]
            timestamp = datetime.datetime.now().isoformat(timespec="seconds")
            client_ip = self.client_address[0]
            count = bump_login_count()
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(f"{timestamp} | ip={client_ip} | login #{count}\n")
            profile = load_data()["profile"]
            return self._send_json({
                "token": "test-session-token",
                "name": username or profile.get("name", "Test Student"),
                "roll_no": profile.get("roll_no", "TEST-000")
            })

        if path == "/api/chatbot":
            return self._send_json({"reply": portal_ai_reply(payload.get("message", ""))})

        if path == "/api/pdf-ai":
            pdf_path = safe_pdf_path(payload.get("name", ""))
            if not pdf_path or not os.path.isfile(pdf_path):
                return self._send_json({"error": "Choose a PDF from the server library first."}, 404)
            try:
                text = extract_pdf_text(pdf_path)
                if not text:
                    return self._send_json({"error": "No selectable text was found in this PDF."}, 422)
                result = pdf_study_result(text, payload.get("action", "summary"), payload.get("query", ""))
                result["source"] = os.path.basename(pdf_path)
                return self._send_json(result)
            except Exception as e:
                return self._send_json({"error": str(e)}, 500)

        match = re.fullmatch(r"/api/assignments/([^/]+)/submit", path)
        if match:
            data = load_data()
            aid = match.group(1)
            found = False
            for a in data["assignments"]:
                if str(a.get("id")) == aid:
                    a["status"] = "submitted"
                    a["submission"] = str(payload.get("text", ""))[:4000]
                    found = True
                    break
            if found:
                save_data(data)
                return self._send_json({"status": "submitted"})
            return self._send_json({"error": "Assignment not found"}, 404)

        if path.startswith("/api/admin/"):
            if not self._admin_ok(payload=payload):
                return self._send_json({"error": "Invalid admin password"}, 401)
            data = load_data()

            if path == "/api/admin/announcement":
                item = {
                    "id": "n" + datetime.datetime.now().strftime("%Y%m%d%H%M%S%f"),
                    "title": str(payload.get("title", "")).strip()[:140],
                    "body": str(payload.get("body", "")).strip()[:2000],
                    "level": payload.get("level", "info") if payload.get("level") in ("info", "important", "urgent") else "info",
                    "date": datetime.date.today().isoformat()
                }
                if not item["title"] or not item["body"]:
                    return self._send_json({"error": "Title and message are required"}, 400)
                data["announcements"].insert(0, item)
                save_data(data)
                return self._send_json(item)

            if path == "/api/admin/event":
                item = {
                    "id": "e" + datetime.datetime.now().strftime("%Y%m%d%H%M%S%f"),
                    "title": str(payload.get("title", "")).strip()[:140],
                    "date": str(payload.get("date", "")).strip(),
                    "time": str(payload.get("time", "")).strip()[:8],
                    "type": str(payload.get("type", "event")).strip()[:30],
                    "location": str(payload.get("location", "")).strip()[:180]
                }
                try:
                    datetime.date.fromisoformat(item["date"])
                except Exception:
                    return self._send_json({"error": "Use a valid event date"}, 400)
                if not item["title"]:
                    return self._send_json({"error": "Event title is required"}, 400)
                data["events"].append(item)
                data["events"].sort(key=lambda x: (x.get("date", ""), x.get("time", "")))
                save_data(data)
                return self._send_json(item)

            if path == "/api/admin/assignment":
                item = {
                    "id": "a" + datetime.datetime.now().strftime("%Y%m%d%H%M%S%f"),
                    "title": str(payload.get("title", "")).strip()[:180],
                    "subject": str(payload.get("subject", "")).strip()[:100],
                    "due_date": str(payload.get("due_date", "")).strip(),
                    "status": "pending"
                }
                try:
                    datetime.date.fromisoformat(item["due_date"])
                except Exception:
                    return self._send_json({"error": "Use a valid due date"}, 400)
                if not item["title"] or not item["subject"]:
                    return self._send_json({"error": "Title and subject are required"}, 400)
                data["assignments"].append(item)
                save_data(data)
                return self._send_json(item)

            if path == "/api/admin/profile":
                allowed = ["name", "roll_no", "department", "semester", "section", "email", "phone", "bio", "avatar"]
                for k in allowed:
                    if k in payload:
                        data["profile"][k] = str(payload[k]).strip()[:500]
                save_data(data)
                return self._send_json(data["profile"])

            if path == "/api/admin/timetable":
                try:
                    day_index = int(payload.get("day_index"))
                    period_index = int(payload.get("period_index"))
                    subject = str(payload.get("subject", "")).strip()[:100]
                    if not subject:
                        raise ValueError
                    data["timetable"]["grid"][day_index][period_index] = subject
                except Exception:
                    return self._send_json({"error": "Invalid timetable cell"}, 400)
                save_data(data)
                return self._send_json(data["timetable"])

            if path == "/api/admin/delete":
                kind = payload.get("kind")
                item_id = str(payload.get("id", ""))
                mapping = {"announcement": "announcements", "event": "events", "assignment": "assignments"}
                key = mapping.get(kind)
                if not key:
                    return self._send_json({"error": "Invalid item type"}, 400)
                before = len(data[key])
                data[key] = [x for x in data[key] if str(x.get("id")) != item_id]
                if len(data[key]) == before:
                    return self._send_json({"error": "Item not found"}, 404)
                save_data(data)
                return self._send_json({"status": "deleted"})

            if path == "/api/admin/delete-pdf":
                pdf_path = safe_pdf_path(payload.get("name", ""))
                if not pdf_path or not os.path.isfile(pdf_path):
                    return self._send_json({"error": "PDF not found"}, 404)
                os.remove(pdf_path)
                return self._send_json({"status": "deleted"})

        return self._send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    os.chdir(ROOT)
    ensure_data_file()
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Nexus Campus running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
