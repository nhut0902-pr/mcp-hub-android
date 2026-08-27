# Third-party notices

The terminal emulator, terminal view and PTY JNI source under `android/src/main/java/com/termux` and `android/src/main/jni` were copied for review and integration from the Android implementation at https://github.com/AidanPark/openclaw-android, which is distributed under the MIT License. This provenance does not by itself change licensing of any upstream-derived file.

The original Termux project is available at https://github.com/termux/termux-app and is GPL-3.0-or-later. Some integrated files retain Termux package names and may be derivative works. The GPLv3 text is retained in `LICENSES/GPL-3.0-only.txt` for this review branch.

## Distribution block

No public APK containing these vendor files may be released until the file-level SPDX/copyright audit recorded in `docs/native-runtime-license-audit.md` is complete. If any file is GPL-covered, the release must retain its notices, include the applicable GPL text, and make the complete corresponding source for the combined work available in a durable public source location under the required terms. Otherwise, that file must be replaced with an independently licensed implementation before release. The current native-runtime work is therefore an engineering checkpoint, not a release authorization.
