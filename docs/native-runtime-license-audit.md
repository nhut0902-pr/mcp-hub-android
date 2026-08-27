# Native runtime license audit — release gate

## Scope

This review covers the terminal emulator, terminal view, text-selection code and PTY JNI files placed under `modules/mcp-hub-runtime/android/src/main`. They were imported during an engineering review from the MIT-licensed `AidanPark/openclaw-android` project and retain `com.termux` package names.

## Initial findings

| Finding | Evidence | Release impact |
| --- | --- | --- |
| AOSP-derived popup compatibility helper | `PopupWindowCompatGingerbread.java` contains an Apache-2.0 header | Retain its attribution and Apache-2.0 terms. |
| Most terminal/view/JNI source has no file-level SPDX or copyright header after import | Automated scan found no provenance declaration for those files | Provenance and license cannot be established from the shipped source alone. |
| Termux application repository states GPL-3.0-or-later | Upstream repository license and package naming | Treat potentially derivative files as GPL-covered until a file-level review proves otherwise. |
| Combined-work licensing decision | User authorized GPLv3 distribution; `COPYING`, `NOTICE` and `SOURCE_CODE.md` define the release source route | Preserve all notices and publish the tagged corresponding source with each APK. |

## Required release decision

The GPL distribution route was selected by the project owner. Before a public V1.0.11 APK is created, the following must be complete:

1. Preserve the GPL terms and all known third-party notices in the source tree and release documentation.
2. Publish the exact tagged corresponding source with the APK in the public project repository.
3. Retain the Apache-2.0 attribution for the AOSP-derived helper and the MIT reference attribution for the OpenClaw Android integration reference.

This is a technical compliance record, not legal advice.
