---
name: wechat-article-layout
description: Use when an author wants a Chinese WeChat article written, revised, or formatted as a local draft, especially when preserving approved wording, checking evidence, or reviewing mobile layout matters.
---

# WeChat article writing and layout

## Scope and decisions

Deliver a local draft only. Never log in to WeChat, upload content, create cloud drafts, or publish. A request to format is not permission to rewrite or publish. No dependency on any private archive, account, image collection, or other Skill is required.

1. Establish the latest approved draft, intended reader, length, tone, and whether this is writing, research, revision, or formatting-only. For formatting-only, freeze wording: fix typography and layout only; propose substantive edits separately for approval. Preserve the author's viewpoint and voice rather than adding generic slogans or invented anecdotes.
2. For research, find original evidence, distinguish facts from opinion, verify quotes and numbers, and retain source links next to the claims they support. If evidence is missing, flag uncertainty; do not fabricate sources. Keep research notes separate from the approved body. If browsing is unavailable, say what remains unverified.
3. Use only owned or authorized images. Record source and permission basis. Do not remove watermarks or retrieve images from a private library by default. Keep article images under the Markdown file's directory; the local adapter rejects remote images and path traversal. Use text/geometric layout when rights are unclear.
4. Ask for approval of a newly written or substantively changed draft before formatting. Store approved text separately; do not overwrite it. Optional user-owned `creator.local.yaml` may describe audience, tone, and preferred theme; read it only if explicitly supplied, never require it or include it in deliverables. Do not store secrets there.
5. If Raphael is available, follow [the adapter reference](references/raphael.md). Install dependencies at the package root and supply the exact pinned official build separately. Never silently replace Raphael with homemade styling and call it Raphael. If unavailable, hand off Markdown and explain that layout is pending.
6. Open the generated preview at 360 px and 390 px. Check heading wraps, paragraph spacing, image/caption order, contrast, overflow and source links. Compare the final text with the latest approved draft; inspect the output rather than trusting a successful command. Record any review not performed.
7. Deliver the Markdown, authorized assets, local preview, rich HTML, and receipt. Clearly say this is a local draft, not a WeChat cloud draft or published article. If the author later manually pastes HTML into WeChat, remind them to check image ingestion, links, mobile layout and platform disclosures there; do not claim editor compatibility was tested unless it was.

## Common pitfalls

- Deadline pressure does not authorize changing approved text, inventing evidence, or publishing.
- A pinned hash verifies build identity, not safety. Treat external JavaScript and input HTML as trusted-only; jsdom is not a security sandbox.
- A neat preview does not validate factual claims or image rights.
