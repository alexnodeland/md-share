# URL compression

A survey of ways to make share URLs shorter (or, failing that, more resilient), measured against the 7-question check in [PHILOSOPHY.md](../../PHILOSOPHY.md).

> Context: md-share puts the whole document into the URL via lz-string. When docs grow (long prose, embedded base64 images, Mermaid diagrams), URLs cross the 2–8 KB range where SMS, Slack, Discord, email clients, and some CDNs start mangling them. A URL-shortener service would solve it by moving state off the user's machine — directly violating gate #1 — so the question is whether we can compress harder instead.

The seven gates are shorthanded as:
1. No server? 2. Respects existing flavors? 3. Export parity? 4. Degrades for listen/print/mobile? 5. No friction on write → share? 6. Pure-logic with injected deps? 7. Ships under the `verify` gate at 100% pure-module coverage?

The `Compressor` port in `src/ports.ts` already isolates this. Any option below is one-file in principle: swap the adapter, optionally tag the payload so old and new links both parse.

---

## Option 1 — Brotli via `CompressionStream`

Use the browser's native `CompressionStream('deflate-raw' | 'gzip' | 'brotli')` plus `DecompressionStream`, base64url the bytes into `?d=` / `#d=`.

- **Win:** on prose longer than ~500 bytes, brotli typically beats lz-string by 30–50%. `deflate-raw` is usually a wash to slightly worse (header overhead dominates on small inputs). Zero bundle cost.
- **Shape:**
  - `Compressor.encode/decode` become `async`. Ripples through `parseShareParams` (called synchronously in `app.ts:boot`) — the initial-URL load becomes a promise, preview shows a placeholder frame until it resolves.
  - New adapter `src/adapters/brotliCompressor.ts` that feature-detects `'brotli'` and falls back to `'gzip'` (or to lz-string) when unsupported.
  - Payload needs a scheme tag so legacy and new links coexist: `?d=lz:…` vs `?d=br:…` (or `#d=br1.…` — any prefix the parser can switch on).
- **Tradeoffs:** browser support for brotli in `CompressionStream` is recent (Chrome 124+, Safari 16.4+; Firefox still lacks brotli at time of writing — gzip-only). Async ripple is real work; the rest of the codebase is cheerfully synchronous today. Base64url adds 33% overhead on top of the compressed bytes — lz-string's 6-bit alphabet is already ~denser per byte, so some of the brotli win is clawed back.
- **Gate:** 1✅ 2 n/a 3✅ 4✅ 5 (async initial load is a small step back) 6✅ 7✅.

## Option 2 — Brotli via WASM

Bundle a brotli wasm (e.g. `brotli-wasm`, ~200–300 KB) and use it regardless of browser capability. Lazy-loaded only when the share modal opens or when a `br:`-prefixed payload is encountered.

- **Win:** best ratios, uniform behaviour across browsers. Room for a custom encoder dictionary too (see option 3).
- **Shape:** new adapter, lazy dynamic-`import`. Keep the lz-string adapter as the synchronous default for tiny docs and as a decoder for legacy links.
- **Tradeoffs:** bundle cost. md-share's ethos is "open over `file://`, static assets, small"; a 250 KB wasm for compression conflicts with that. KaTeX and Mermaid pay their cost by being the feature; compression isn't on-screen, so users won't see why the app got bigger. Only worth it if option 1 isn't good enough and there's demonstrated demand.
- **Gate:** 1✅ 2 n/a 3✅ 4✅ 5 (lazy-load keeps it off the critical path) 6✅ 7✅ — but the "small static asset" spirit of #1 starts to strain.

## Option 3 — Brotli with a shared dictionary

Brotli (native or wasm) supports a seed dictionary. Prepare one from common Markdown tokens: `# `, `## `, `### `, ``` ``` ```, ` ```mermaid`, ` ```math`, `| --- |`, `[[`, `]]`, `[^`, `![[`, KaTeX primitives (`\\frac`, `\\mathbb`, `\\begin{`), Obsidian callout headers, Atlassian panel markup, frontmatter keys (`title:`, `date:`, `tags:`), etc.

- **Win:** another 10–20% on top of option 1/2, concentrated on the short-to-medium docs where generic encoders can't amortize their header. Compounds best with a flavor-aware dictionary — pick the dict based on `f=<flavor>`.
- **Shape:** `src/compressDict.ts` produces the dictionary (pure, flavor-switchable). Adapter wires it into the encoder. Dictionary ships as a versioned string; payload tag becomes `br1:…` / `br1-gfm:…` etc. so we can evolve the dict without breaking old links (the old dict ID must keep its encoder available).
- **Tradeoffs:** the dictionary is now a protocol — every version we ship must live forever as a decoder. That is manageable but it's real versioning discipline. Wins are flavor-dependent; plain prose may barely notice.
- **Gate:** 1✅ 2✅ 3✅ 4✅ 5✅ 6✅ 7 (coverage on the dictionary selector, encoder glue, version handling).

## Option 4 — Cheap pre-processing *(implemented in this change)*

Deterministic, reversible-enough normalization before handing the text to lz-string. Costs nothing, stays synchronous, does not change the wire format.

- **Win:** typically a few percent on messy inputs (Windows line endings, trailing blank lines, stray BOM). The more important property is that equivalent documents produce equivalent URLs, improving cache-ability and QR stability.
- **Shape:** a pure `normalizeSource(text)` in `src/share.ts` applied inside `encodeDoc`. Rules:
  - Strip a leading UTF-8 BOM (`U+FEFF`).
  - Normalize line endings: `\r\n` → `\n`, lone `\r` → `\n`.
  - Trim trailing whitespace at end of file (preserves in-line two-space hard breaks, which are never semantically meaningful on the last line).
- **Tradeoffs:** the loaded text may differ from what a user pasted by a BOM or a trailing blank line. None of those are visible in a rendered Markdown document.
- **Gate:** 1✅ 2✅ 3✅ 4 n/a 5✅ 6✅ 7✅.

## Option 5 — Move payload to URL fragment *(implemented in this change)*

Not compression; robustness. Emit share URLs as `…/#d=<encoded>&f=<flavor>&a=<anchor>` instead of `…/?d=…&f=…#<anchor>`. The byte count on the wire is the same, but the fragment has materially better properties for the "share a link" use case.

- **Wins:**
  - Fragments are never sent to the server. Static hosts (GitHub Pages, Cloudflare Pages, Netlify) and their CDNs stop seeing document content in access logs, `Referer` headers, and analytics. Aligns with principle #1 in spirit: the document truly never leaves the user's machine.
  - CDN and platform URL-length limits usually apply to the *request-line* (method + path + query), not the fragment. Long docs that would 414 as `?d=…` often load cleanly as `#d=…`.
  - Some corporate proxies and SSRF-paranoid link previewers fetch the URL server-side; fragment payloads skip that round-trip entirely.
- **Shape:**
  - `buildShareURL` emits `#d=…&f=…&a=…`.
  - `parseShareParams` checks the hash first (`URLSearchParams(hash).has('d')`); if absent, falls back to the legacy query string. Anchors: from the new `a=` sub-param when the payload is in the hash; from the raw `#fragment` when the payload is in the query (preserves legacy heading-link URLs).
  - `headingLinks.ts` stops string-concatenating `#anchor` onto the result of `buildShareURL` — it passes the anchor as the existing `anchor` argument so composition stays with `share.ts`.
  - `window.history.replaceState(null, '', window.location.pathname)` already strips both query and hash, so the banner-clear logic is unchanged.
- **Tradeoffs:**
  - Cosmetically different URLs. Docs, CLAUDE.md, and CONTRIBUTING.md need to stop claiming "`?d=`" as the canonical form.
  - Embedding in environments that strip fragments (very rare — some email link scrubbers historically did) would break. Accept it; those environments will have stripped `?d=` too.
  - No compat break — legacy `?d=` URLs continue to load.
- **Gate:** 1✅ (strengthens #1) 2 n/a 3✅ 4✅ 5✅ 6✅ 7✅.

---

## Suggested sequencing

1. **Options 4 + 5 first** (this change). Cheap, synchronous, preserves backward compatibility, tightens principle #1.
2. **Measure.** Add URL-size reporting to `src/ui/share.ts` (the size meter is already there — issue #2 in `next-level-features.md`). See whether real documents actually blow past the soft/hard thresholds *after* 4 + 5.
3. **If still too long: option 1** (native brotli) with a `br:` / `lz:` tag prefix and a gzip fallback for Firefox. The async ripple is the main cost; mitigate with a skeleton preview frame during decode.
4. **If even that isn't enough: option 3** (brotli + flavor-aware dictionary). Bigger wins on the short docs that get shared most often.
5. **Option 2 (brotli via wasm) only** if we need uniform cross-browser behaviour for some product reason — otherwise the bundle cost is hard to justify.

## Explicitly out of bounds (for reference)

Server-side URL shortener, Gist / S3 offload, IPFS gateway. All fail gate #1; see the discussion in `next-level-features.md` ("Explicitly out-of-bounds").

## Notes for future implementers

- The `Compressor` port is the single swap point. Keep it that way.
- Never remove the lz-string decoder. Legacy links are the durability promise of the app; breaking them breaks the core thesis.
- Payload-format tags (`lz:`, `br1:`, etc.) should be prefixes that an old build can recognize as "unknown" and surface gracefully ("this link was made with a newer md-share — update and reload").
- `URLSearchParams` decodes `+` as space. lz-string's URL-safe alphabet happens not to collide with this for typical inputs, but any new encoder (base64url) must avoid `+` in its alphabet or the parser must switch to manual splitting.
