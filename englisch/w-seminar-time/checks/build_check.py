#!/usr/bin/env python3
"""Build an encrypted online check (generic, works for any topic).

Usage:  python3 checks/build_check.py material/check-1-research-methods.json [out-dir]

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

  Text blocks: a slot can also be a block of several tasks on one text. Each
  student gets one variant of the block, i.e. one text with its tasks:
    { "block": true, "variants": [
        { "passage": {"id", "title", "byline", "paras": [[line, line, …], …]},
          "items": [item, item, …] }, … ] }
  "paras" are paragraphs of lines; lines are numbered across the text (as in an
  exam sheet), so prompts can refer to "l. 5" or "ll. 10–11". All variants of a
  block need the same number of items, and at each position the same type and
  points (comparable versions).

Output:
  <out-dir>/<name>.js       – everything encrypted with AES-256-GCM (key from the
                              start code via PBKDF2-SHA256, 600 000 rounds),
                              padded to a multiple of 8 KiB. Public are only the
                              check id, a build id and the crypto parameters:
                              no title, no number of tasks, no points, no answers.
                              Option/row/category/text ids are random and the order
                              of options and rows is shuffled, so not even the
                              authored order can be read after decrypting.
                              out-dir: 2nd argument, else checks/ next to the
                              material folder, else the folder of this script.
  material/<name>-key.json  – key file for the scoring page checks/auswertung/:
                              questions, texts, ids, correct answers, scale. Stays
                              on the teacher's computer.
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


def opaque(old_ids, n=4):
    """Map authored ids to random n-character ids (unique within the item)."""
    out, used = {}, set()
    for o in old_ids:
        while True:
            new = ''.join(secrets.choice(IDCHARS) for _ in range(n))
            if new not in used:
                used.add(new); out[o] = new; break
    return out


def main(src, out_dir=None):
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
    keyitems, keypass, md, used = {}, {}, [], set()
    passage_ids = opaque([f"{n}.{v}" for n, s in enumerate(data['slots'], 1) if s.get('block')
                          for v in range(len(s['variants']))], 6)

    def item(it, label, ps=None):
        iid = it['id']
        if iid in used:
            sys.exit(f"Item id {iid} is used twice")
        used.add(iid)
        pub = {k: it[k] for k in ('id', 'type', 'points', 'prompt')}
        key = dict(pub)
        if ps:
            key['ps'] = ps
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
            ans = '<br>'.join(('✓ ' if o[2] else '✗ ') + o[1] for o in it['options'])
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
        keyitems[iid] = key
        md.append(f"## Task {label} · version {iid} ({it['points']} P)\n\n{it['prompt']}\n\n{ans}\n")
        return pub

    slots, total, nr = [], 0, 1
    for n, slot in enumerate(data['slots'], 1):
        if slot.get('block'):
            shape = None
            variants = []
            for v, var in enumerate(slot['variants']):
                sh = [(it['type'], it['points']) for it in var['items']]
                if shape is None:
                    shape = sh
                elif sh != shape:
                    sys.exit(f"Slot {n}: all variants of a block need the same tasks (type, points) in the same order")
                p = var['passage']
                pid = passage_ids[f"{n}.{v}"]
                text = {'title': p['title'], 'byline': p.get('byline', ''), 'paras': p['paras']}
                keypass[pid] = dict(text, ref=p.get('id', ''))
                lines = [l for para in p['paras'] for l in para]
                md.append(f"# Text {p.get('id', pid)}: {p['title']}\n\n{p.get('byline', '')}\n\n" +
                          '\n'.join(f"{i:>2}  {l}" for i, l in enumerate(lines, 1)) + '\n')
                items = [item(it, f"{nr + k}", pid) for k, it in enumerate(var['items'])]
                variants.append({'passage': dict(text, id=pid), 'items': items})
            total += sum(p for _, p in shape)
            nr += len(shape)
            slots.append({'block': True, 'variants': variants})
        else:
            variants, pts = [], None
            for it in slot['variants']:
                pts = it['points'] if pts is None else pts
                if it['points'] != pts:
                    sys.exit(f"Slot {n}: all variants need the same points")
                variants.append(item(it, f"{nr}"))
            total += pts
            nr += 1
            slots.append({'variants': variants})

    meta = {'title': data['title'], 'subtitle': data.get('subtitle', ''), 'minutes': data['minutes'],
            'tasks': nr - 1, 'max': total}
    plain = json.dumps({'id': data['id'], 'build': build, 'meta': meta, 'slots': slots}, ensure_ascii=False).encode('utf-8')
    plain += b' ' * (-len(plain) % PAD)        # hide the size of the check
    salt, iv = secrets.token_bytes(16), secrets.token_bytes(12)
    k = hashlib.pbkdf2_hmac('sha256', norm(code).encode(), salt, ITER, 32)
    cipher = AESGCM(k).encrypt(iv, plain, None)

    public = {'id': data['id'], 'build': build, 'kdf': {'salt': b64(salt), 'iter': ITER}, 'iv': b64(iv), 'data': b64(cipher)}
    base = os.path.splitext(os.path.basename(src))[0]
    mat = os.path.dirname(os.path.abspath(src))
    if not out_dir:
        beside = os.path.join(os.path.dirname(mat), 'checks')
        out_dir = beside if os.path.isdir(beside) else os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(out_dir, base + '.js'), 'w', encoding='utf-8') as f:
        f.write('/* Generated by build_check.py – encrypted, contains no answers. Do not edit by hand. */\n')
        f.write('window.CHECK = ' + json.dumps(public) + ';\n')
    key = {'format': 2, 'check': data['id'], 'build': build, 'title': data['title'],
           'subtitle': data.get('subtitle', ''), 'lang': data.get('lang', 'en'),
           'minutes': data['minutes'], 'startCode': code, 'max': total,
           'scale': data['scale'], 'items': keyitems}
    if keypass:
        key['passages'] = keypass
    with open(os.path.join(mat, base + '-key.json'), 'w', encoding='utf-8') as f:
        json.dump(key, f, ensure_ascii=False, indent=1)
    with open(os.path.join(mat, base + '-key.md'), 'w', encoding='utf-8') as f:
        f.write(f"# {data['title']} – answer key\n\nStart code: **{code}** · {data['minutes']} min · "
                f"{total} points · build {build}\n\n")
        f.write("Scoring (page checks/auswertung/, with the -key.json file of the same build): "
                "single = all or nothing; multi = (correct ticks − wrong ticks) ÷ number of correct "
                "options × points, min. 0, rounded to 0.5; match = equal share per row, rounded to 0.5.\n\n")
        f.write("Notenpunkte: " + ' · '.join(f"≥{p} % → {np}" for p, np in data['scale']) + "\n\n")
        f.write('\n'.join(md))
    print(f"start code: {code}\nbuild {build}: {total} points, {nr - 1} tasks\n"
          f"wrote {os.path.relpath(os.path.join(out_dir, base + '.js'))}, "
          f"material/{base}-key.json, material/{base}-key.md")


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'material/check-1-research-methods.json',
         sys.argv[2] if len(sys.argv) > 2 else None)
