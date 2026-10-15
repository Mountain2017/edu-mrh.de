#!/usr/bin/env python3
"""Build an encrypted online check (generic, works for any topic).

Usage:  python3 checks/build_check.py material/check-1-research-methods.json

Input: the plain-text question file in material/ (answers in clear text; the
folder is in .gitignore and must never be pushed). Format:

  {
    "id": "w-seminar-time-check-1",      unique per check (browser storage key)
    "title": "Check 1: Research methods",
    "subtitle": "W-Seminar English · Time · Year 12",
    "lang": "en",                         language of the score reports (en/de)
    "minutes": 20,
    "startCode": "auto",                  or an own code with ≥ 12 letters/digits
    "scale": [[95, 15], [90, 14], …, [0, 0]],   percent → grade points
    "slots": [ { "variants": [ item, item, … ] }, … ]   one variant per student
  }

  item types (all variants of a slot need the same points):
    single  {"id", "type", "points", "prompt", "options": [[id, text, correct?], …]}
    multi   same as single, several correct options
    match   {"id", "type", "points", "prompt", "categories": [[id, label], …],
             "rows": [[id, text, category-id], …]}
  prompt and option/row texts may contain simple HTML (<em>, <b>, <br>).

Output:
  checks/<name>.js          – everything encrypted with AES-256-GCM (key from the
                              start code via PBKDF2-SHA256, 600 000 rounds),
                              padded to a multiple of 8 KiB. Public are only the
                              check id, a build id and the crypto parameters:
                              no title, no number of tasks, no points, no answers.
                              Option/row/category ids are random and the order of
                              options and rows is shuffled, so not even the
                              authored order can be read after decrypting.
  material/<name>-key.json  – key file for the scoring page checks/auswertung/:
                              questions, ids, correct answers, scale. Stays on the
                              teacher's computer.
  material/<name>-key.md    – the same key, readable

Rebuilding creates new ids: result files only fit the key file of the same
build. Rebuild before the lesson, never after students took the check.
"""
import base64, hashlib, json, os, random, re, secrets, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITER = 600_000
PAD = 8192
ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
IDCHARS = 'abcdefghijkmnpqrstuvwxyz23456789'


def norm(code):
    return re.sub(r'[^0-9A-Z]', '', code.upper())


def b64(b):
    return base64.b64encode(b).decode('ascii')


def opaque(old_ids):
    """Map authored ids to random 4-character ids (unique within the item)."""
    out, used = {}, set()
    for o in old_ids:
        while True:
            n = ''.join(secrets.choice(IDCHARS) for _ in range(4))
            if n not in used:
                used.add(n); out[o] = n; break
    return out


def main(src):
    data = json.load(open(src, encoding='utf-8'))
    code = data.get('startCode', 'auto')
    if code == 'auto' or not code:
        raw = ''.join(secrets.choice(ALPHABET) for _ in range(12))
        code = '-'.join(raw[i:i + 4] for i in range(0, 12, 4))
        data['startCode'] = code
        with open(src, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
    if len(norm(code)) < 12:
        sys.exit('startCode must have at least 12 letters/digits (or use "auto").')

    rnd = random.SystemRandom()
    build = secrets.token_hex(4)
    slots, keyitems, md, total = [], {}, [], 0
    for n, slot in enumerate(data['slots'], 1):
        variants, pts = [], None
        for it in slot['variants']:
            pts = it['points'] if pts is None else pts
            if it['points'] != pts:
                sys.exit(f"Slot {n}: all variants need the same points")
            iid = it['id']
            if iid in keyitems:
                sys.exit(f"Item id {iid} is used twice")
            pub = {k: it[k] for k in ('id', 'type', 'points', 'prompt')}
            key = dict(pub)
            if it['type'] in ('single', 'multi'):
                ids = opaque([o[0] for o in it['options']])
                opts = [{'id': ids[o[0]], 'text': o[1]} for o in it['options']]
                right = [ids[o[0]] for o in it['options'] if o[2]]
                if it['type'] == 'single' and len(right) != 1:
                    sys.exit(f"Item {iid}: single needs exactly one correct option")
                if it['type'] == 'multi' and not right:
                    sys.exit(f"Item {iid}: multi needs at least one correct option")
                shuffled = opts[:]; rnd.shuffle(shuffled)
                pub['options'] = shuffled
                key['options'] = opts
                key['correct'] = right[0] if it['type'] == 'single' else right
                ans = '; '.join(o[1] for o in it['options'] if o[2])
            elif it['type'] == 'match':
                cid = opaque([c[0] for c in it['categories']])
                rid = opaque([r[0] for r in it['rows']])
                cats = [{'id': cid[c[0]], 'label': c[1]} for c in it['categories']]
                rows = [{'id': rid[r[0]], 'text': r[1]} for r in it['rows']]
                for r in it['rows']:
                    if r[2] not in cid:
                        sys.exit(f"Item {iid}: row {r[0]} has an unknown category {r[2]}")
                shuffled = rows[:]; rnd.shuffle(shuffled)
                pub['categories'] = cats          # shown in this order in every select
                pub['rows'] = shuffled
                key['categories'] = cats
                key['rows'] = rows
                key['correct'] = {rid[r[0]]: cid[r[2]] for r in it['rows']}
                labels = dict(it['categories'])
                ans = '<br>'.join(f"{r[1]} → **{labels[r[2]]}**" for r in it['rows'])
            else:
                sys.exit(f"Item {iid}: unknown type {it['type']}")
            variants.append(pub)
            keyitems[iid] = key
            md.append(f"## Task {n} · version {iid} ({it['points']} P)\n\n{it['prompt']}\n\n{ans}\n")
        total += pts
        slots.append({'variants': variants})

    meta = {'title': data['title'], 'subtitle': data.get('subtitle', ''), 'minutes': data['minutes'],
            'tasks': len(slots), 'max': total}
    plain = json.dumps({'id': data['id'], 'build': build, 'meta': meta, 'slots': slots}, ensure_ascii=False).encode('utf-8')
    plain += b' ' * (-len(plain) % PAD)        # hide the size of the check
    salt, iv = secrets.token_bytes(16), secrets.token_bytes(12)
    k = hashlib.pbkdf2_hmac('sha256', norm(code).encode(), salt, ITER, 32)
    cipher = AESGCM(k).encrypt(iv, plain, None)

    public = {'id': data['id'], 'build': build, 'kdf': {'salt': b64(salt), 'iter': ITER}, 'iv': b64(iv), 'data': b64(cipher)}
    base = os.path.splitext(os.path.basename(src))[0]
    here = os.path.dirname(os.path.abspath(__file__))
    mat = os.path.dirname(os.path.abspath(src))
    with open(os.path.join(here, base + '.js'), 'w', encoding='utf-8') as f:
        f.write('/* Generated by build_check.py – encrypted, contains no answers. Do not edit by hand. */\n')
        f.write('window.CHECK = ' + json.dumps(public) + ';\n')
    with open(os.path.join(mat, base + '-key.json'), 'w', encoding='utf-8') as f:
        json.dump({'format': 2, 'check': data['id'], 'build': build, 'title': data['title'],
                   'subtitle': data.get('subtitle', ''), 'lang': data.get('lang', 'en'),
                   'minutes': data['minutes'], 'startCode': code, 'max': total,
                   'scale': data['scale'], 'items': keyitems}, f, ensure_ascii=False, indent=1)
    with open(os.path.join(mat, base + '-key.md'), 'w', encoding='utf-8') as f:
        f.write(f"# {data['title']} – answer key\n\nStart code: **{code}** · {data['minutes']} min · "
                f"{total} points · build {build}\n\n")
        f.write("Scoring (page checks/auswertung/, with the -key.json file of the same build): "
                "single = all or nothing; multi = (correct ticks − wrong ticks) ÷ number of correct "
                "options × points, min. 0, rounded to 0.5; match = equal share per row, rounded to 0.5.\n\n")
        f.write("Notenpunkte: " + ' · '.join(f"≥{p} % → {np}" for p, np in data['scale']) + "\n\n")
        f.write('\n'.join(md))
    print(f"start code: {code}\nbuild {build}: {total} points, {len(slots)} tasks\n"
          f"wrote checks/{base}.js, material/{base}-key.json, material/{base}-key.md")


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'material/check-1-research-methods.json')
