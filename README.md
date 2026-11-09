# WeChat article layout skill

A standalone Agent Skill for Chinese article writing, evidence review and mobile-first layout. All outputs are local drafts. It never signs into WeChat, uploads articles, creates cloud drafts or publishes.

## Install

Clone/download this repository. Copy `wechat-article-layout-skill/` into your agent's supported skills directory to install the instructions. To use the optional renderer, keep this complete repository (including `package.json`) and run commands from its root. The renderer is not self-contained when copied without its dependency manifest.

Requires Node.js 20+ and npm. Install pinned dependencies:

```sh
npm ci --ignore-scripts
npm test
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

## Local demo

Separately obtain the exact reviewed official Raphael frontend build described in [the reference](wechat-article-layout-skill/references/raphael.md). Save it in `work/raphael-bundle.js`. It is deliberately not included or automatically downloaded. An unavailable or changed official build is a hard limitation: do not bypass the hash check.

```sh
node wechat-article-layout-skill/scripts/render_raphael.cjs --input examples/fictional-article.md --out outputs/demo --bundle work/raphael-bundle.js --theme sspai
```

Creates `preview.html`, `wechat.html`, and `receipt.json`. Existing outputs are not overwritten; use a fresh directory for each run. The receipt records `cloudDraftCreated:false` and `published:false`. Open the preview locally and inspect at 360 px and 390 px. `wechat.html` is a rich-text candidate, not a guarantee of WeChat editor compatibility. Any later manual paste requires checking images and layout in the editor.

The article is wholly fictional. Its SVG is self-created, static geometry. Article images must be local relative paths confined to the Markdown directory (including real/symlink targets); remote images, inline data URLs, active SVG and traversal are rejected. Only trusted Markdown/HTML and the reviewed bundle should be used. jsdom is not a security sandbox; run in an OS-level sandbox with no network for stronger isolation. No account credentials are needed.

Optional private `creator.local.yaml` can describe the caller's audience, tone and preferred theme. Supply it explicitly to your agent if desired; no file is required and the adapter does not parse it. Keep it outside shared deliverables. `.gitignore` excludes it, bundles, dependencies, local environment files, and generated output; ignore rules are not a substitute for reviewing uploads.

## Testing

`npm test` runs safety and package checks. Privacy checks inspect every Git-tracked text file (including SVG, lockfiles and tests), not a fixed allowlist; Git is required for this inventory in a checkout. Source archives without `.git` are scanned recursively, excluding documented local-work directories/configuration. Findings report filenames and rule categories, never matched values. Pattern scans cannot establish the absence of all private material, and binary assets still require manual review. The optional exact-build end-to-end test runs when `RAPHAEL_BUNDLE` points to the separately obtained official file. A skipped test does not establish rendering compatibility. Test dependencies are declared and locked; no private files are necessary.

## License and attribution

This repository's original code, instructions and fictional example are MIT licensed, copyright 2026 JoyM1993. [Raphael](https://github.com/liuxiaopai-ai/raphael-publish) is a separate project by Raphael Editor Contributors, under its [MIT license](https://github.com/liuxiaopai-ai/raphael-publish/blob/main/LICENSE). Its frontend build is not redistributed here, and this project does not claim authorship of that engine. See the reference for the supported hash and external-code risk.
