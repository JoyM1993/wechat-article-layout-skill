# Optional local Raphael adapter

Raphael is maintained independently at [the official repository](https://github.com/liuxiaopai-ai/raphael-publish). The official [LICENSE](https://github.com/liuxiaopai-ai/raphael-publish/blob/main/LICENSE) states MIT, copyright 2024 Raphael Editor Contributors. No third-party engine code is bundled in this repository. Retain upstream notices if you independently redistribute that code under its license.

Supported official build: [index-B1xyRFkz.js](https://publish.raphael.app/assets/index-B1xyRFkz.js).

SHA-256: `a72c53c9b1eba634cfa27d01f62c882d9d6035aa41be04bc801d203ba3e3b069`.

Download separately from the official source, inspect it, and compare SHA-256 before use. On PowerShell use `Get-FileHash work/raphael-bundle.js -Algorithm SHA256`; on systems with sha256sum use `sha256sum work/raphael-bundle.js`. The adapter independently enforces this same hash. It never downloads a file or trusts a caller-selected hash.

The adapter depends on private minified symbols in this exact build. If it disappears or changes, rendering is unavailable until a maintainer reviews the new upstream build, license and API and updates code plus tests. Never replace a hash alone, bypass it, or label a fallback renderer as Raphael.

Run from the repository root after `npm ci --ignore-scripts`:

```sh
node wechat-article-layout-skill/scripts/render_raphael.cjs --input examples/fictional-article.md --out outputs/demo --bundle work/raphael-bundle.js --theme sspai
```

The script evaluates verified third-party JavaScript inside jsdom 26. It does not mount the editor or call a cloud-draft API. jsdom is not a security sandbox: malicious code may escape or consume resources. This is for trusted local articles only; use OS-level isolation and deny network access for stronger protection. Ordinary fetch/XHR/WebSocket calls and automatic resource loading are disabled; this is not a general security guarantee.

Images are embedded from the article directory only. PNG, JPEG, WebP, GIF and restricted static SVG are supported; data/remote URLs and symlink escapes are rejected. Escape article HTML cautiously: executable elements and event handlers are removed, and the preview adds a restrictive content security policy. Do not treat this limited filtering as a general HTML sanitizer for hostile input.

Inspect `preview.html` at 360 px and 390 px, compare approved text and check images. `wechat.html` and `receipt.json` remain local. No WeChat login, upload, cloud draft, or publication is performed. Copying into WeChat later is a separate user action requiring its own visual review.
