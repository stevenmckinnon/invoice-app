import json, urllib.request, urllib.error, sys

BASE = "http://localhost:3000"
EMAIL, PASSWORD = "demo@caley.test", "demopassword123"

def call(path, method="GET", body=None, token=None, want_header=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Origin", BASE)
    if body is not None:
        req.add_header("Content-Type", "application/json")
        def clean(v):
            if isinstance(v, dict): return {k: clean(x) for k, x in v.items() if x is not None}
            if isinstance(v, list): return [clean(x) for x in v]
            return v
        req.data = json.dumps(clean(body)).encode()
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as r:
            data = r.read()
            hdr = r.headers.get(want_header) if want_header else None
            return (json.loads(data) if data else None), hdr
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, path, e.read().decode()[:300]); sys.exit(1)

# account: sign up the first time, sign in afterwards
try:
    call("/api/auth/sign-up/email", "POST", {"email": EMAIL, "password": PASSWORD, "name": "Alex Morgan"})
except SystemExit:
    pass
_, token = call("/api/auth/sign-in/email", "POST", {"email": EMAIL, "password": PASSWORD}, want_header="set-auth-token")

call("/api/profile", "PUT", {
    "firstName": "Alex", "lastName": "Morgan", "addressLine1": "12 Studio Row", "addressLine2": "",
    "city": "London", "state": "", "postalCode": "E8 3AB", "country": "United Kingdom",
    "dateOfBirth": None, "iban": "GB29NWBK60161331926819", "swiftBic": "NWBKGB2L",
    "accountNumber": "31926819", "sortCode": "60-16-13", "bankAddress": "Example Bank plc, London",
    "currency": "GBP"}, token)

existing = {c["name"] for c in call("/api/clients", token=token)[0]}

def client(name, attn, a1, city, pc, day, pdw, pdt, tier):
    if name in existing: return
    c = {"name": name, "attentionTo": attn, "addressLine1": a1, "addressLine2": "", "city": city, "state": "",
         "postalCode": pc, "country": "United Kingdom", "dayRate": str(day), "perDiemWork": str(pdw),
         "perDiemTravel": str(pdt), "overtimeTierHours": "", "overtimeFirstRate": "", "overtimeAfterRate": "",
         "travelWorkBill": "both", "travelWorkPerDiem": "travel"}
    if tier:
        c.update({"overtimeTierHours": "2", "overtimeFirstRate": "1.5x", "overtimeAfterRate": "2x"})
    call("/api/clients", "POST", c, token)

client("Northlight Pictures", "Production Office", "4 Wharf Lane", "Bristol", "BS1 4RT", 450, 40, 40, True)
client("Harbour Street Productions", "Accounts", "88 Quay Road", "Glasgow", "G2 8QP", 380, 35, 35, False)
client("Brightwater Live", "Crew Coordinator", "21 Arena Way", "Manchester", "M4 6BF", 520, 45, 45, True)
clients, _ = call("/api/clients", token=token)
cid = {c["name"]: c for c in clients}
print("clients:", list(cid))

def days(start, spec):
    """spec: list of (offset, type, extra) from a start date (yyyy-mm-dd)"""
    from datetime import date, timedelta
    y, m, d = map(int, start.split("-")); base = date(y, m, d)
    out = []
    for off, typ, extra in spec:
        item = {"date": (base + timedelta(days=off)).isoformat(), "type": typ}
        item.update(extra); out.append(item)
    return out

W = lambda o, **e: (o, "work", e)
T = lambda o, **e: (o, "travel", e)
D = lambda o, **e: (o, "dark", e)

jobs = [
  # number, date, show, client, status, days, expenses
  ("INV-2601", "2026-04-24", "The Salt Road, Series 2", "Northlight Pictures", "paid",
     days("2026-04-13", [W(0), W(1, overtimeHours=2), W(2), W(3), W(4, overtimeHours=1.5)]), []),
  ("INV-2602", "2026-05-29", "Lowtide: Brand Film", "Harbour Street Productions", "paid",
     days("2026-05-18", [T(0), W(1), W(2), W(3, overtimeHours=2)]), [("Train tickets", 1, 64.50)]),
  ("INV-2603", "2026-06-26", "Kingfisher Live Tour", "Brightwater Live", "paid",
     days("2026-06-08", [W(0), W(1), W(2), D(3), W(4), W(5, overtimeHours=3)]), [("Parking", 3, 12.0)]),
  ("INV-2604", "2026-07-24", "Midnight Rail, Block 4", "Northlight Pictures", "paid",
     days("2026-07-06", [W(0), W(1, overtimeHours=2.5), W(2), W(3), W(4)]), []),
  ("INV-2605", "2026-08-21", "Ember Sessions Live", "Brightwater Live", "paid",
     days("2026-08-10", [T(0), W(1), W(2, overtimeHours=2), W(3)]), [("Taxi", 2, 28.0)]),
  ("INV-2606", "2026-09-18", "Harbour Lights (Feature)", "Harbour Street Productions", "overdue",
     days("2026-08-31", [W(0), W(1), W(2), W(3, overtimeHours=1), W(4), W(7), W(8)]), []),
  ("INV-2607", "2026-10-09", "Brightwater Awards Night", "Brightwater Live", "sent",
     days("2026-09-28", [T(0), W(1), W(2, overtimeHours=2), W(3)]), [("Tool hire", 1, 85.0)]),
  ("INV-2608", "2026-10-16", "The Salt Road, Series 2 (pickups)", "Northlight Pictures", "sent",
     days("2026-10-05", [W(0), W(1), W(2, overtimeHours=1.5), W(3)]), []),
  ("INV-2609", "2026-10-26", "Paper Moon, Pilot", "Harbour Street Productions", "draft",
     days("2026-10-19", [W(0), W(1), W(2, overtimeHours=2), D(3), W(4)]), []),
]

have = {i["invoiceNumber"] for i in call("/api/invoices", token=token)[0]}
for number, date_, show, cname, status, ds, exps in jobs:
    if number in have: continue
    c = cid[cname]
    call("/api/invoices", "POST", {
        "invoiceNumber": number, "invoiceDate": date_, "showName": show,
        "fullName": "Alex Morgan", "email": EMAIL, "addressLine1": "12 Studio Row", "addressLine2": None,
        "city": "London", "state": None, "postalCode": "E8 3AB", "country": "United Kingdom",
        "iban": "GB29NWBK60161331926819", "swiftBic": "NWBKGB2L", "accountNumber": "31926819",
        "sortCode": "60-16-13", "bankAddress": "Example Bank plc, London", "dateOfBirth": None,
        "currency": "GBP", "clientId": c["id"], "clientName": c["name"], "clientAddress1": c["addressLine1"],
        "clientAddress2": None, "clientCity": c["city"], "clientState": None, "clientPostalCode": c["postalCode"],
        "clientCountry": "United Kingdom", "attentionTo": c.get("attentionTo"), "notes": None, "status": status,
        "days": ds,
        "customExpenseEntries": [{"id": f"new-{i}", "description": d, "quantity": q, "unitPrice": p,
                                   "cost": round(q * p, 2)} for i, (d, q, p) in enumerate(exps)]}, token)

inv, _ = call("/api/invoices", token=token)
for i in sorted(inv, key=lambda x: x["invoiceNumber"]):
    print(i["invoiceNumber"], i["status"], i["totalAmount"], i["showName"])
