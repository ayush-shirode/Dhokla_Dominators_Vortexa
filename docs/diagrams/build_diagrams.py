#!/usr/bin/env python3
"""Generates docs/technical-approach.svg and docs/user-flow.svg (edit here, then re-run:
   python3 docs/diagrams/build_diagrams.py  and  node docs/diagrams/render-png.mjs)."""
import html, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent
INK, DIM, PAPER, CARD = '#1e2a3a', '#5b6472', '#f3f0e6', '#fbf9f2'
TEAL, TEAL_BG = '#0f6e5c', '#dcece7'
WHEAT, WHEAT_BG = '#9c6e26', '#f1e4c7'
SLATE, SLATE_BG = '#44546a', '#e4e8ee'
LINE = '#c9c2ac'
FONT = "'Public Sans','DejaVu Sans','Segoe UI',Arial,sans-serif"
e = html.escape

class Svg:
    def __init__(self, w, h, title):
        self.w, self.h, self.p = w, h, []
        self.p.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{e(title)}">')
        self.p.append(f'<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker>'
                      f'<marker id="at" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{TEAL}"/></marker>'
                      f'<marker id="aw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{WHEAT}"/></marker></defs>')
        self.p.append(f'<rect width="{w}" height="{h}" fill="{PAPER}"/>')
    def text(self, x, y, s, size=13, weight=400, fill=INK, anchor='start', italic=False):
        st = ' font-style="italic"' if italic else ''
        self.p.append(f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{st}>{e(s)}</text>')
    def rect(self, x, y, w, h, fill=CARD, stroke=LINE, r=8, dash=None, sw=1.3):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        self.p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>')
    def box(self, x, y, w, h, title, lines=(), fill=CARD, stroke=LINE, tcolor=INK, dash=None, size=12.5):
        h = h or 40 + len(lines) * 18 + 10
        self.rect(x, y, w, h, fill, stroke, dash=dash)
        self.text(x + 12, y + 22, title, 14, 700, tcolor)
        for i, l in enumerate(lines):
            warn = l.startswith('!')
            self.text(x + 12, y + 44 + i * 18, l[1:] if warn else l, size, 600 if warn else 400, WHEAT if warn else DIM)
        return y, y + h

    def stack(self, x, y, w, items, gap=14):
        """Draws boxes top to bottom with automatic heights. Returns {title: (top, bottom)}."""
        pos = {}
        for it in items:
            title, lines, kw = it[0], it[1], (it[2] if len(it) > 2 else {})
            if 'cols' in kw:  # side-by-side pair
                a, b = kw['cols']
                ya = self.box(x, y, w // 2 - 6, None, a[0], a[1], **a[2])
                yb = self.box(x + w // 2 + 6, y, w // 2 - 6, None, b[0], b[1], **b[2])
                top, bot = y, max(ya[1], yb[1])
                pos[a[0]] = (top, ya[1]); pos[b[0]] = (top, yb[1])
                y = bot + gap
                continue
            top, bot = self.box(x, y, w, None, title, lines, **kw)
            pos[title] = (top, bot)
            y = bot + gap
        return pos
    def arrow(self, pts, color=INK, dash=None, marker='a', both=False, sw=2):
        d = ' '.join(('M' if i == 0 else 'L') + f'{x},{y}' for i, (x, y) in enumerate(pts))
        da = f' stroke-dasharray="{dash}"' if dash else ''
        ms = f' marker-start="url(#{marker})"' if both else ''
        self.p.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}"{da} marker-end="url(#{marker})"{ms} stroke-linejoin="round"/>')
    def label(self, x, y, s, color=INK, anchor='middle', size=11.5, bg=PAPER):
        w = len(s) * size * 0.56 + 12
        bx = x - w / 2 if anchor == 'middle' else x - 6
        self.p.append(f'<rect x="{bx}" y="{y - size - 1}" width="{w}" height="{size + 7}" rx="4" fill="{bg}" opacity="0.95"/>')
        self.text(x, y, s, size, 600, color, anchor)
    def badge(self, x, y, n, color=TEAL):
        self.p.append(f'<circle cx="{x}" cy="{y}" r="11" fill="{color}"/>')
        self.text(x, y + 4.5, str(n), 12.5, 700, '#ffffff', 'middle')
    def save(self, name):
        (OUT / name).write_text('\n'.join(self.p) + '\n')
        print('wrote', name)
    def end(self): self.p.append('</svg>')

# ============================================================ 1. architecture
s = Svg(1500, 920, 'RationSaathi technical approach')
s.text(40, 40, 'RationSaathi — technical approach', 26, 700)
s.text(40, 62, 'Offline-first PWA + small API. The maths, the report wording and the privacy checks are plain code; AI only drafts, and only when the user allows it.', 13.5, 400, DIM)

# zones
s.rect(30, 100, 470, 765, fill='#eef3f0', stroke=TEAL, r=14, sw=1.8)
s.text(50, 129, 'ON THE PHONE (installable, works offline)', 13, 700, TEAL)
s.rect(540, 100, 470, 765, fill='#f4f1ea', stroke=SLATE, r=14, sw=1.8)
s.text(560, 129, 'SERVER (Express + TypeScript + SQLite)', 13, 700, SLATE)
s.rect(1050, 100, 420, 765, fill='#f7f1e3', stroke=WHEAT, r=14, sw=1.8)
s.text(1070, 129, 'OUTSIDE (only when the user chooses)', 13, 700, WHEAT)

T = dict(stroke=TEAL); L = dict(stroke=SLATE); O = dict(stroke=WHEAT)
ph = s.stack(50, 146, 430, [
 ('Next.js app (React, Tailwind)', ['Household and rule setup · month ledger · report', 'Complaint helper · 13 languages · "Listen" everywhere'], T),
 ('Shared engine (same code in browser and server)', ['Entitlement and shortfall maths in whole grams (no AI)', 'Neutral report and complaint text, English and Hindi', 'Neutrality guard: blocks words that accuse anyone', 'Aadhaar / VID redaction (checksum-validated)', 'Offline readers for receipts, SMS and spoken sentences', 'Card catalog: 36 states and UTs, each with its source'], dict(fill=TEAL_BG, stroke=TEAL)),
 ('IndexedDB: source of truth on the device', ['Households, months, records, reports, filings', 'Photos waiting to be read · sync outbox', '!Ration card number stays here. It is never sent.'], T),
 ('', None, dict(cols=(('Service worker', ['App opens with no signal'], T), ('Browser speech', ['Voice entry · read-aloud'], T)))),
 ('Rules the screens enforce', ['Rule must be confirmed before any total shows', 'Anything AI reads is a draft the user confirms', 'Complaint is copied only after a read-back'], dict(fill=WHEAT_BG, stroke=WHEAT, tcolor=WHEAT)),
])
s.text(50, 790, 'Offline changes are queued and sent when the connection returns;', 12, 400, DIM)
s.text(50, 807, 'newer server copies are pulled back.', 12, 400, DIM)

sv = s.stack(560, 146, 430, [
 ('Device token (no accounts)', ['Random token on first launch; only its hash is stored'], L),
 ('REST API  /api/v1', ['households · checks · records · summary · sync', 'reports + export · complaint helper · filing reference'], L),
 ('Photo pipeline (all on this server)', ['1  Quality gate: blur, dark, glare, too small → retake', '2  Local OCR (Tesseract, English + Hindi)', '3  Find Aadhaar numbers and paint them black', '4  Keep only the masked JPEG; original never saved'], dict(fill=SLATE_BG, stroke=SLATE)),
 ('AI drafts', ['Rule-based reading first; hosted model only if allowed', 'Results stay drafts until the user confirms them', 'Numbers re-added in code; translations keep every number'], L),
 ('Reports', ['Immutable snapshot + SHA-256 hash; new version on change', 'Export: text, printable page, PDF (English + Hindi)'], L),
 ('Channel directory', ['35 state card portals + helplines, with source and date'], L),
 ('SQLite file + masked photos on disk', ['"Delete everything" removes the device and all its files'], dict(fill=SLATE_BG, stroke=SLATE)),
])

ot = s.stack(1070, 146, 380, [
 ('Official grievance portal', ['nfsa.gov.in or the state portal, in a new tab', 'The user enters their own Aadhaar OTP and submits', '!RationSaathi never submits, embeds or copies', '!any government login or form.'], dict(stroke=WHEAT, dash='6 4')),
 ('Research data → card catalog', ['ration_data/*.csv (state card types and sources)', 'pnpm build:card-catalog', 'Compiled into packages/shared, so it works offline', 'Only AAY/PHH with an official source pre-fill'], O),
 ('Hosted AI model (optional)', ['Photo reading, translation, voice and chat help', 'Used only after "Send once" / "Always allow"', 'and only if the server has a key', '!Sent: masked photo or redacted text.', '!Never: card number, Aadhaar, or an account.'], O),
 ('What this is not', ['No farm-to-shop tracing', 'No ranking or naming of shops or officials', 'No cause stated: reports list possible causes', 'and say none is established', 'No automatic filing'], dict(fill=WHEAT_BG, stroke=WHEAT, tcolor=WHEAT)),
])

# arrows: straight lines only
mid = lambda t: (t[0] + t[1]) / 2
s.arrow([(500, mid(ph['Shared engine (same code in browser and server)'])), (540, mid(ph['Shared engine (same code in browser and server)']))], TEAL, marker='at', both=True)
s.label(520, mid(ph['Shared engine (same code in browser and server)']) - 8, 'HTTPS', TEAL, size=10.5)
ai_y = mid(sv['AI drafts']); hosted_y = mid(ot['Hosted AI model (optional)'])
s.arrow([(990, ai_y), (1030, ai_y), (1030, hosted_y), (1070, hosted_y)], WHEAT, dash='7 5', marker='aw')
s.label(1030, ai_y - 10, 'only with consent', WHEAT, size=10.5)
# phone -> portal: over the top of the zones
px_ = mid(ot['Official grievance portal'])
s.arrow([(265, 100), (265, 84), (1420, 84), (1420, ot['Official grievance portal'][0])], WHEAT, dash='7 5', marker='aw')
s.label(760, 80, 'the user opens the portal themselves and files it with their own OTP', WHEAT, size=11)
s.text(40, 898, 'Stack: pnpm monorepo · Next.js 16 / React 19 / Tailwind 4 · Express · node:sqlite · sharp · Tesseract · pdfkit · zod · vitest + Playwright checks', 12, 400, DIM)
s.end(); s.save('technical-approach.svg')

# ============================================================ 2. user flow with trust gates
f = Svg(1500, 760, 'From evidence to complaint')
f.text(40, 46, 'From evidence to complaint — where the user stays in control', 26, 700)
f.text(40, 70, 'Teal = plain code. Wheat = the user decides. Slate = optional AI that can only draft.', 13.5, 400, DIM)

steps = [
 ('1', 'Choose state and card', ['State list → that state\'s card names', 'AAY / PHH pre-fill a sourced figure', 'Other cards: user types figure + source'], TEAL_BG, TEAL),
 ('2', 'Confirm the rule', ['Formula shown: 5 kg × 4 = 20 kg', 'Source and "last verified" date shown', 'Any edit un-confirms it'], WHEAT_BG, WHEAT),
 ('3', 'Add what was received', ['Type · paste SMS · speak · photo', 'Each visit is a record with evidence', 'No evidence → labelled Unrecorded'], TEAL_BG, TEAL),
 ('4', 'Check every reading', ['Photo, voice and AI results are drafts', 'Doubtful values are highlighted', 'Unchecked → Unclear (not counted)'], WHEAT_BG, WHEAT),
 ('5', 'Plain arithmetic', ['Entitlement − counted received', 'Shortfall · Late · Unrecorded · Unclear', 'Labels describe data, never causes'], TEAL_BG, TEAL),
 ('6', 'Neutral report', ['Every record with its evidence', 'Line-by-line sums + SHA-256 hash', 'Possible causes listed, none claimed'], TEAL_BG, TEAL),
 ('7', 'Listen, copy, file', ['Complaint text read aloud first', 'Fields copied to the official portal', 'User files with their own OTP'], WHEAT_BG, WHEAT),
]
x0, w, gap, y0, h = 34, 190, 14, 110, 190
for i, (n, title, lines, bg, col) in enumerate(steps):
    x = x0 + i * (w + gap)
    f.rect(x, y0, w, h, fill=bg, stroke=col, r=12, sw=1.8)
    f.badge(x + 20, y0 + 22, n, col)
    # wrap title
    words, cur, rows = title.split(), '', []
    for wd in words:
        if len(cur + ' ' + wd) > 20 and cur: rows.append(cur); cur = wd
        else: cur = (cur + ' ' + wd).strip()
    rows.append(cur)
    for j, r in enumerate(rows): f.text(x + 40, y0 + 27 + j * 16, r, 14, 700, INK)
    off = 27 + len(rows) * 16 + 12
    for j, l in enumerate(lines):
        words, cur, wr = l.split(), '', []
        for wd in words:
            if len(cur + ' ' + wd) > 27 and cur: wr.append(cur); cur = wd
            else: cur = (cur + ' ' + wd).strip()
        wr.append(cur)
        for k, r in enumerate(wr):
            f.text(x + 14, y0 + off, r, 11.8, 400, DIM); off += 15
        off += 5
    if i < len(steps) - 1:
        f.arrow([(x + w + 1, y0 + 95), (x + w + gap - 1, y0 + 95)], INK, sw=2)

# trust gates strip
f.text(40, 352, 'Who is in charge at each step', 16, 700)
gates = [
 ('Code', 'Entitlement maths, labels, report and complaint wording, neutrality and Aadhaar checks. Works offline. AI is never involved.', TEAL_BG, TEAL),
 ('User', 'Confirms the rule, confirms every machine reading, listens to the complaint before copying it, and submits it on the official site.', WHEAT_BG, WHEAT),
 ('Optional AI', 'Reads photos, voice and regional-language text, and translates. Always returns a draft with a confidence level; asked for each use.', SLATE_BG, SLATE),
]
gx = 34
for t, d, bg, col in gates:
    f.rect(gx, 372, 458, 112, fill=bg, stroke=col, r=12, sw=1.8)
    f.text(gx + 16, 399, t, 15, 700, col)
    words, cur, rows = d.split(), '', []
    for wd in words:
        if len(cur + ' ' + wd) > 62 and cur: rows.append(cur); cur = wd
        else: cur = (cur + ' ' + wd).strip()
    rows.append(cur)
    for j, r in enumerate(rows): f.text(gx + 16, 424 + j * 17, r, 12.3, 400, INK)
    gx += 458 + 20

# photo path
f.text(40, 530, 'What happens to a photo of a slip', 16, 700)
pp = [('Phone', 'Take photo\n(offline: kept\non the phone)'), ('Server', 'Quality gate\nblur · dark · glare'), ('Server', 'Local OCR\n(no third party)'), ('Server', 'Black out\nAadhaar numbers'), ('Server', 'Store masked\nJPEG only'), ('Draft', 'Read values\nshown to user'), ('User', 'Confirms or\nedits → record')]
px, pw, pg, py, ph = 34, 182, 24, 552, 96
cols = {'Phone': (TEAL_BG, TEAL), 'Server': (SLATE_BG, SLATE), 'Draft': (SLATE_BG, SLATE), 'User': (WHEAT_BG, WHEAT)}
for i, (who, txt) in enumerate(pp):
    x = px + i * (pw + pg)
    bg, col = cols[who]
    f.rect(x, py, pw, ph, fill=bg, stroke=col, r=10, sw=1.6)
    f.text(x + 12, py + 22, who.upper(), 10.5, 700, col)
    for j, l in enumerate(txt.split('\n')): f.text(x + 12, py + 46 + j * 17, l, 12.5, 600 if j == 0 else 400, INK if j == 0 else DIM)
    if i < len(pp) - 1: f.arrow([(x + pw + 1, py + 48), (x + pw + pg - 1, py + 48)], INK, sw=1.8)
f.text(40, 690, 'If the photo is unclear the user is asked to retake it. Nothing is guessed, and the unmasked original never reaches disk or any AI service.', 12.5, 400, DIM)
f.text(40, 716, 'Hosted AI, if allowed, receives the masked image from step 5 — not the original.', 12.5, 400, DIM)
f.end(); f.save('user-flow.svg')
