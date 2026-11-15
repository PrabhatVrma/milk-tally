# Milk tally for Android

Native Android WebView app with Milk tally branding, package images, per-install local quantities, Firebase Firestore price refresh, an owner-admin page, and Android share-sheet bill sharing.

- Main tally requires no login.
- The owner admin page uses Firebase Email/Password Auth. Email/Password is enabled, the owner account exists, and the owner-only Firestore rules are published. Verify the owner email before using the admin panel; the password is never stored in the app source. Support messages must be marked read before deleting.
- See the complete setup and security details in [`../README.md`](../README.md).

## Install

Install `../outputs/Milk-tally.apk` on an Android phone. If Android asks, allow the browser or file manager to install from that source, then open **Milk tally**.

## Build

Requirements: JDK 17+ and Android SDK Platform 35 / Build Tools 35.0.0.

```powershell
..\cloud\sync-app.ps1
.\gradlew.bat assembleDebug
```

The included v1.9 APK is release-signed and non-debuggable. Build updates with `../cloud/build-release.ps1`; the keystore is stored outside the repository under the current Windows user profile.
