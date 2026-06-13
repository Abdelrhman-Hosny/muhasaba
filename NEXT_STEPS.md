# Next Steps

Checkpoint notes for picking the project back up.

## ⏳ Blockers / pending

### Run on physical phone (blocked on NDK)
The phone build fails with a corrupt NDK:

```
[CXX1101] NDK at ~/Library/Android/sdk/ndk/27.1.12297006 did not have a source.properties file
```

The folder is a failed partial download (only a `.installer` dir, no `source.properties`).

**Fix:** reinstall NDK `27.1.12297006` (the version pinned by the Expo config), then re-run the build.
- **GUI (preferred):** Android Studio → SDK Manager → **SDK Tools** tab → enable **Show Package Details** → **NDK (Side by side)** → uncheck `27.1.12297006` → Apply (removes broken copy) → check it again → Apply.
- **CLI:**
  ```sh
  rm -rf ~/Library/Android/sdk/ndk/27.1.12297006
  /opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin/sdkmanager \
    --sdk_root=$HOME/Library/Android/sdk "ndk;27.1.12297006"
  ```
- Then: `npx expo run:android --device` and **pick `SM_G970F` (the phone)**, not the emulator.

Note: Android 12 on the phone is fine — not the cause. App `minSdk` is 24.

## 🧹 Polish (optional)

- [x] **Auto-scroll the day strip** to the selected chip (added `ScrollView` ref + `scrollTo` on selected change).
- [x] **Bold title:** Loaded `Cairo_700Bold` and set up `fontBold` in theme.
- [x] **`/account` route is missing** — Scaffolded `/account` screen.
- [ ] **Custom Deed Save Alert Popup Bug**: Success alert popup for newly created custom deeds doesn't reliably show on some systems/devices (potentially due to modal/navigation unmount race conditions).
- [ ] Consider a **circular progress ring** instead of the bar, and/or a **7-day streak row**.

## 🔭 Feature direction

- Generalize prayers into a **task** model — prayers become a task subtype. Status is already a clean binary `not_yet | done` primitive to build on.
- **Supabase sync** (auth chosen for ease):
  - Use **anonymous auth** (`signInAnonymously`) so the app stays local-first with no login wall; link a real account later to keep data.
  - Persist session in **`expo-secure-store`**, add `import 'react-native-url-polyfill/auto'`, set `autoRefreshToken` + an `AppState` listener.
  - Data model already has `user_id`, `updated_at` (LWW), `deleted` (tombstone), `dirty`. Enable **RLS** with `user_id = auth.uid()`.
  - Hand-roll a push/pull sync (pull `updated_at > last_pull`, push dirty rows, resolve by newest `updated_at`). Consider PowerSync/ElectricSQL only if sync correctness becomes a time sink.

## 🛠 Dev environment reference

- SDK: `~/Library/Android/sdk` (`ANDROID_HOME` updated in `~/.zshrc`).
- Emulator: `Pixel_8` (API 37). Boot headless: `emulator -avd Pixel_8`.
- `cmdline-tools` lives only in the old brew SDK (`/opt/homebrew/share/android-commandlinetools`), not the Studio SDK — relevant for `sdkmanager`/`avdmanager`.
- Daily loop: `npx expo start` → press `a` (emulator) or open the dev client app on a device. Native rebuild (`expo run:android`) only when native deps/config change.
