"""
How src/assets/link-dictionary-v1.txt was made (kept for the record; v1 is frozen).

A preset dictionary for share links (`dd1.` payloads): common Markdown syntax for every
flavor, plus English words and word pairs ranked by how many documents use them (counted
over the Markdown files in node_modules at the time: frequencies, not prose; rerunning
today gives slightly different bytes, which is one more reason v1 is frozen). The most
frequent entries sit at the end, nearest the compressed text, where deflate references them
most cheaply.

NEVER regenerate v1 in place: every dd1. link ever shared decodes against these exact bytes
(tests/assets/linkDictionary.test.ts pins its SHA-256). A better dictionary is a new file and
a new payload tag (dd2.), with dd1. kept for decoding.

Usage: python3 scripts/link-dictionary.py 32768 > src/assets/link-dictionary-vN.txt
"""
import hashlib, re, subprocess, sys, os, collections

SIZE = int(sys.argv[1])
files = sorted(subprocess.run("find node_modules -iname '*.md' -size +1k -size -80k", shell=True, capture_output=True, text=True).stdout.split())
seen, train = set(), []
for f in files:
    t = open(f, encoding='utf-8', errors='replace').read().replace('\r\n', '\n')
    h = hashlib.sha1(t.encode()).hexdigest()
    if h in seen: continue
    seen.add(h)
    if int(hashlib.sha1(f.encode()).hexdigest(), 16) % 3 != 0: train.append(t)
# Document frequency of lower-case words and word pairs (frequency counts, not prose).
wdf, bdf = collections.Counter(), collections.Counter()
for t in train:
    words = re.findall(r"[A-Za-z][a-z']{1,14}", t)
    wdf.update(set(w.lower() for w in words))
    bdf.update(set(f'{a} {b}'.lower() for a, b in zip(words, words[1:])))
SYNTAX = """---
title: 
tags: 
date: 
author: 
---

# 
## 
### 
#### 

- [ ] 
- [x] 
- **
1. 
2. 
3. 
> 
> [!note] 
> [!tip] 
> [!warning] 
> [!info] 
> [!important] 
> [!caution] 
> [!example] 
> [!quote] 
> [!NOTE]
> [!TIP]
> [!WARNING]
{info:title=}
{note}
{warning}
{tip}
{panel:title=}
{expand:}
{code:language=}
{code}
{status:colour=Green|title=}
[[]]
![[]]
==highlight==
~~strike~~
%%comment%%
[^1]: 
[^note]
$$
\\frac{}{}
\\sqrt{}
\\sum_{i=1}^{n}
\\int_{0}^{\\infty}
\\alpha \\beta \\gamma \\lambda \\mathbf{} \\mathrm{} \\text{} \\left( \\right)
```mermaid
graph TD
A --> B
sequenceDiagram
```bibliography
@article{, author = {}, title = {}, journal = {}, year = {}}
@book{, author = {}, title = {}, publisher = {}, year = {}}
[@]
{#fig:}
{#tbl:}
{#eq:}
| --- | --- | --- |
|:---|:---:|---:|
<details>
<summary></summary>
</details>
<br>
```bash
```sh
```js
```ts
```python
```json
```yaml
```html
```css
```
](https://github.com/
](https://www.
](https://
](#
![](
https://example.com/
TODO: 
Note: 
e.g. i.e. etc. vs.
"""
words = [w for w, _ in wdf.most_common(2500)]
bigrams = [b for b, c in bdf.most_common(1200) if c >= 4]
parts = []
# Least useful first; the most frequent end up nearest the data.
for b in reversed(bigrams): parts.append(b + ' ')
for w in reversed(words): parts.append(w + ' ')
body = ''.join(parts)
syntax = SYNTAX
dict_text = (body + '\n' + syntax).encode()
dict_text = dict_text[-SIZE:]
sys.stdout.buffer.write(dict_text)
print(len(dict_text), file=sys.stderr)
