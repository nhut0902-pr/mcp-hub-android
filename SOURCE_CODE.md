# MCP Hub — Corresponding Source

The complete corresponding source for each MCP Hub APK is maintained in the public repository below. Release tags identify the exact source associated with each APK.

```bash
git clone https://github.com/nhut0902-pr/mcp-hub-android.git
cd mcp-hub-android
git checkout v1.0.11
pnpm install --frozen-lockfile
npx expo prebuild --platform android --no-install --clean
cd android
./gradlew app:assembleRelease --no-daemon
```

The resulting APK is written to `android/app/build/outputs/apk/release/app-release.apk`. The build uses Node.js 22, JDK 17, Android SDK Platform 36, Build Tools 36.0.0, and Android NDK 27.1.12297006. The release workflow in `.github/workflows/release-apk.yml` records the same reproducible build steps.

## License and notices

MCP Hub V1.0.11 is distributed under the GNU General Public License, version 3. The complete license text is in `COPYING`. The Termux-related terminal implementation is described in `modules/mcp-hub-runtime/THIRD_PARTY_NOTICES.md`; its provenance review is maintained in `docs/native-runtime-license-audit.md`.

Any recipient may obtain, inspect, modify, and redistribute the corresponding source under the terms in `COPYING`.
