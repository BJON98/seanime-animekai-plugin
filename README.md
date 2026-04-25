# AnimeKai Seanime Plugin (Self-Contained v2.0)

Improved AnimeKai streaming provider for Seanime that removes the dependency on `enc-dec.app`.

## What's different from the original

| Issue | Original Plugin | This Version |
|---|---|---|
| Encryption/decryption | Depends on `enc-dec.app` API (single point of failure) | Native implementation - no external service needed |
| Episode URL bug | `?dub=` after query params (malformed URL) | Fixed to `&dub=` |
| Error handling | No retries, single fetch failures kill everything | Retry logic on all network calls |
| Missing sources | Throws error if m3u8 has no resolution variants | Falls back to direct m3u8 link |
| Batch processing | External dependency on enc-dec.app for every episode | Processes locally, no external calls |

## Installation

1. Host `provider.ts` and `manifest.json` on GitHub (or use raw URLs)
2. Open Seanime -> Extensions tab
3. Paste the raw URL to `manifest.json`
4. Click Install

For local testing, place both files in your Seanime data directory under `extensions/animekai-v2/`.

## How the crypto works

The encryption/decryption is ported from the [protozoa-cryptography](https://github.com/kaorlol/protozoa) Rust crate (MIT licensed). It uses:

- **RC4 cipher** operating on UTF-16 code units
- **URL-safe Base64** encoding (no padding)
- **Multi-layer encryption** with 3 RC4 keys and character substitution

Three operations that previously called `enc-dec.app`:
- `animekaiEncrypt()` replaces `GET /api/enc-kai?text=...`
- `animekaiDecrypt()` replaces `POST /api/dec-kai`
- `megaupDecrypt()` replaces `POST /api/dec-mega`

## Important note

No streaming plugin can "always work" - AnimeKai may change their site structure, API endpoints, or encryption at any time. This plugin eliminates the most common failure mode (enc-dec.app going down) but will still need updates if AnimeKai changes their site.