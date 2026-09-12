from pathlib import Path

path = Path('/home/ubuntu/entertainment-tracker/client/src/pages/Home.tsx')
text = path.read_text()
old = '{richMetadata.released && <span><strong>Released</strong><small>{richMetadata.released}</small></span>}'
new = old + '{richMetadata.runtime ? <span><strong>Runtime</strong><small>{richMetadata.runtime} min</small></span> : null}'
if old not in text:
    raise SystemExit('runtime insertion point not found')
if '{richMetadata.runtime ? <span><strong>Runtime</strong>' in text:
    raise SystemExit('runtime display already present')
path.write_text(text.replace(old, new, 1))
