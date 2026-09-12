from pathlib import Path
p = Path('/home/ubuntu/entertainment-tracker/client/src/pages/Home.tsx')
s = p.read_text()
old = 'onClick={() => onSetDefault(defaultCategory === value ? null : value)}'
new = 'onClick={() => { const next = defaultCategory === value ? null : value; onSetDefault(next); setCategory(next); }}'
if old not in s:
    raise SystemExit('target not found')
p.write_text(s.replace(old, new, 1))
