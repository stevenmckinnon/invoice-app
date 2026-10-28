# App Store assets

Everything for the App Store listing, rebuilt from the real app so it can be refreshed after a UI change.

| What | Where |
| --- | --- |
| Words (name, subtitle, description, keywords, URLs) | `listing.json` |
| Final screenshots to upload | `screenshots/iphone-6.3/` (1206x2622, for the 6.3" / 6.1" slot), `screenshots/iphone-6.9/` (1320x2868, for the 6.9" slot), `screenshots/ipad-13/` (2752x2064) |
| Raw simulator captures | `captures/iphone/`, `captures/ipad/` |
| Builds the framed screenshots | `compose.py` (headlines live in its `IPHONE` / `IPAD` lists) |
| Fictional demo account and invoices | `demo_seed.py` |

## Refreshing the screenshots

1. Start the dev server (`pnpm dev`), then `python3 demo_seed.py`. It creates `demo@caley.test` / `demopassword123` with three made-up clients and nine invoices. Re-running is safe. Never photograph a real account: client names and bank details end up in public.
2. In the simulator (iPhone 18 Pro, iPad Pro 11-inch): `xcrun simctl status_bar <udid> override --time 9:41 --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4`, light mode, default text size. Sign in as the demo user.
3. Capture each screen at full resolution: `xcrun simctl io <udid> screenshot captures/iphone/04-editor.png`. The names `compose.py` expects are `00-signin`, `01-dashboard`, `02-invoices`, `03-detail`, `04-editor`, `05-assistant` (iPhone) and `01-invoices-split`, `02-editor` (iPad). The editor wants an invoice inside a single month (INV-2608); scroll the sheet down a little so "Days" is at the top.
4. `python3 -m venv .venv && .venv/bin/pip install pillow && .venv/bin/python compose.py`.

To use a hosted screenshot builder instead, upload the files in `captures/`: they are plain simulator screenshots with a clean status bar.

## Upload notes

- **Sizes.** Each upload slot accepts only its own sizes: the 6.3" / 6.1" iPhone slot takes 1206x2622 or 1179x2556 (portrait), the 6.9" slot 1320x2868, the 13" iPad slot 2752x2064. Use the folder that matches the slot. Up to 10 per size; the first three are what shows in search, so the editor, the assistant and the dashboard lead.
- **Review account.** App Review has to be able to sign in. `demo@caley.test` only exists on the dev database. Create a real demo account on https://caley.app (with a few invoices) and put its email and password in App Review Information.
- **Privacy ("App Privacy" questions).** Collected and linked to the user: email address and name (account), financial info (bank details the user enters), and user content (invoices, clients). The assistant sends invoice context to Anthropic to answer. No tracking, no third-party ads or analytics in the app.
- **Account deletion.** Accounts are created on the web, not in the app. If App Review asks for in-app deletion, point them to the web app's Settings; add an in-app link if they insist.
- **Age rating.** None of the content questions apply: 4+.
- **Category.** Primary Business, secondary Finance.
