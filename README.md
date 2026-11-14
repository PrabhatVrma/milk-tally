# Milk tally — project handoff

**Last updated:** 2026-11-15  
**Current Android source version:** 1.7 (`versionCode` 8)
**Android package:** `com.milktally.app`

**v1.7 — Owner price controls & support cleanup:** Admin can edit approved prices directly, mark support messages read, then delete them.

This document is the developer handoff for the Android app and its Firebase project. It records the implemented behavior, cloud schema, build steps, configuration locations, security status, and setup still required for the owner admin panel.

## Status at a glance

| Area | Current status |
|---|---|
| Android app | Native Android shell with local WebView assets; app content is HTML/CSS/JavaScript. |
| Latest APK artifact | `outputs/Milk-tally.apk` is the release-signed v1.7 build (`versionCode` 8). The APK is included in this private repository; signing credentials remain local. |
| Cloud project | Firebase project `milk-tally`, Spark plan, no billing account attached. |
| Active app backend | Cloud Firestore is the only active Google backend in the currently deployed app. |
| Firestore | Standard edition, database `(default)`, region `asia-south1` (Mumbai). Seven product documents plus shared tally and submission collections. |
| Main tally login | None. App users do not need an account. |
| Owner admin panel | `admin.html` uses Firebase Email/Password Auth with in-memory-only sessions. It can directly update product prices, approve/reject suggestions, and mark support messages read before deleting them. The owner account is verified and login was confirmed working. The updated Firestore rules need publishing for support read/delete actions. |
| Firebase Hosting | `firebase.json` and `public/` are configured for Hosting, but a live Hosting deployment is not confirmed. Spark blocks `.apk` uploads to Firebase Hosting. |
| Google Cloud Run / Functions / Storage | Not used by the app. |
| WhatsApp | No WhatsApp API is used. The Android share sheet opens and the user chooses WhatsApp, recipient, and Send. |

## Google/Firebase services used

### Active in the current app

- **Cloud Firestore:** reads approved products, keeps a shared quantity tally, stores price/product suggestions, and stores support messages.
- **Firebase Web SDK delivery:** the app imports Firebase App and Firestore modules from `https://www.gstatic.com/firebasejs/12.19.0/`. This is Google’s JavaScript SDK CDN, not a separate data backend.
- **Android system sharing:** the native Android `ACTION_SEND` chooser passes bill text to a user-selected app. It does not send anything until the user selects a recipient and sends it.

### Not currently used

Firebase Authentication, Firebase Storage, Realtime Database, Cloud Functions, Cloud Run, Cloud Messaging, Firebase Hosting as a live website, and a custom REST API are not used by the currently deployed tally app. The Firebase config contains a `storageBucket` value because Firebase provides it in the web-app config; no Storage SDK is imported and no object is stored there.

Firebase Email/Password Authentication is used only by the owner panel. Real phone OTP is not included; Firebase phone SMS requires billing and is charged per SMS. See [Firebase pricing](https://firebase.google.com/pricing) and [Spark plan details](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

## Firebase project and connection configuration

- **Project display name:** Milk Tally
- **Project ID:** `milk-tally`
- **Firebase Console:** `https://console.firebase.google.com/project/milk-tally/`
- **Billing plan:** Spark, no billing account attached
- **Firestore database:** `(default)`
- **Firestore location:** `asia-south1` (Mumbai)
- **Firebase web app ID:** `1:400902315099:web:368e39ecee38446cdef37e`
- **Auth domain:** `milk-tally.firebaseapp.com`
- **Messaging sender ID:** `400902315099`
- **Storage bucket field:** `milk-tally.firebasestorage.app` (present in client config; unused by app code)
- **Project alias:** `.firebaserc` maps `default` to `milk-tally`.

There is no SQL-style connection string or database username/password. The web SDK initializes from the Firebase client config object in `firebase-config.js`, then uses the default Firestore database over HTTPS. Find the same config in `public/firebase-config.js` and `android-app/app/src/main/assets/www/firebase-config.js`; run `cloud/sync-app.ps1` after changes so copies stay aligned. `firebase-config.example.js` contains placeholders.

### Configuration and secrets

- `firebase-config.js` contains the Firebase Web app config, including `apiKey`. That API key is a **public client identifier**, not an admin credential; it is compiled into the app by design. Access control is enforced by Firestore rules.
- No Firebase service-account private key, admin password, OAuth client secret, refresh token, or production signing key is used by the app or stored in this repository.
- The admin email is entered only in the login form and is not saved in source or displayed after sign-in. The form clears both fields on submit, and Auth is configured not to persist the login across page loads. Firestore rules authorize the verified owner UID. The Firebase Authentication password is not stored here.
- Never place a service-account JSON file, user password, or Android release-signing password in the repo. If a future backend needs a service account, store it outside the APK and use a managed secret store or environment-protected CI secret.

## Current app behavior

- Displays Amul products with locally bundled package images and prices from Firestore.
- Product prices update through Firestore real-time snapshots. **Refresh** also forces a server read.
- Quantity can be changed with plus/minus buttons or entered directly (0–9999). Zero is displayed blank. While typing, the app updates the total locally and saves the shared tally after editing finishes.
- The shared total panel includes Reset and Share bill. Reset clears all shared quantities. The footer compacts above the keyboard while a quantity field is being edited.
- Share bill builds a dated INR summary and opens the Android text-share chooser. The user chooses WhatsApp and sends the message manually.
- Suggestion form creates pending price-change or new-product records. The owner panel can approve/reject them or update prices directly.
- Support form stores the message and optional contact text in Firestore. It does not email anyone.
- The owner panel can mark a support message as read and then delete it. Firestore rules require the verified owner and a `readAt` timestamp before deletion.
- No sign-in is required for the normal tally.

The local fallback and seed prices now use ₹82 for Amul Gold 1 L, matching the last confirmed live Firestore value. Firestore remains the source of truth when online. Check the live `products/gold1l` document before reseeding production.

## Firestore collections and schema

### `products/{productId}`

Publicly readable approved catalog. Product document ID is the stable app ID. Common fields:

```text
name: string
kind: string
price: number
order: number
color: string (optional)
badge: string (optional)
image: string path relative to app assets (optional)
range: string display hint (optional)
```

Seed product IDs: `gold1l`, `gold500`, `taaza`, `slim`, `dahi380`, `dahi85`, `chaas`. The current product seed is `cloud/initial-products.json`; it is a seed/reference file, not an automatic production sync.

### `sharedData/current`

```text
quantities: map<string, number>
updatedAt: Firestore timestamp
```

This is a single tally shared by all anonymous clients. Quantities are also cached in browser localStorage under `milkTallyV1` for immediate rendering and offline fallback.

### `changeRequests/{autoId}`

Public clients may create bounded pending suggestions. Price request fields:

```text
type: "price_change"
productId: string
suggestedPrice: number
note: string
status: "pending"
createdAt: Firestore server timestamp
```

New-product request fields:

```text
type: "new_product"
name: string
kind: string
suggestedPrice: number
note: string
status: "pending"
createdAt: Firestore server timestamp
```

### `supportMessages/{autoId}`

```text
message: string
contact: string (optional; empty if omitted)
createdAt: Firestore server timestamp
```

The owner can add `readAt` when marking a message read; deletion is permitted only after this timestamp exists. These messages are stored in Firestore; there is no email relay or separate support backend.

## Security rules and approval status

Current rules allow anyone to read products and the shared tally, update the shared tally, and create bounded suggestions/support messages. Only the verified owner UID can read submissions, approve requests, or change approved products and prices. There is no per-user rate limit, so the shared tally can be overwritten and public submission collections can be spammed.

The previously published rules allow the verified Firebase Auth UID of the owner account to read support messages and change requests, update request statuses, and write approved product changes. This source update adds owner-only support read markers and deletion of read messages; publish the updated `cloud/firestore.rules` before using those controls. Anonymous access remains limited to the public catalog/shared tally and validated create-only submissions.

### Owner setup required

1. Email/Password has been enabled in Firebase Authentication. Phone/SMS Auth remains disabled.
2. The owner account has been created in Firebase Authentication. Verify the account using its email before signing in; the app requires `emailVerified == true`.
3. The owner UID has been entered in `cloud/firestore.rules`. The owner's email and password are not stored in the source or APK.
4. In Authentication > Settings > Authorized domains, add `appassets.androidplatform.net` if required for email verification links or sign-in inside the Android app's bundled WebView. If you later use another web host, add its hostname too.
5. The existing UID-specific rules were published to Firebase. Publish the latest `cloud/firestore.rules` after this source update so owner message read/delete works.
6. Verify the owner email, then open **Admin**, enter the owner email and password privately, and review the inbox. The form clears the credentials after sign-in.

Email/Password is enabled, the Firebase owner account exists, and the owner confirmed admin login works. The app has no user registration screen and no password is embedded.

## Android implementation

- Native entry point: `android-app/app/src/main/java/com/milktally/app/MainActivity.java`.
- WebView loads bundled assets at `https://appassets.androidplatform.net/assets/www/index.html` through `WebViewAssetLoader`.
- Main app and admin pages are bundled under `android-app/app/src/main/assets/www/`.
- Android permission: `INTERNET`; keyboard resizing uses `adjustResize`.
- Bill sharing is exposed through the `MilkTallyAndroid.shareBill()` JavaScript bridge and Android `Intent.ACTION_SEND` chooser.
- Package: `com.milktally.app`; label: **Milk tally**.
- Gradle: wrapper 8.9; Android Gradle plugin; compile SDK 35, min SDK 23, target SDK 35; `androidx.webkit:webkit:1.12.1`.
- The v1.7 APK is release-signed and has `debuggable=false`. The private keystore and DPAPI-protected password are outside the repo under `%LOCALAPPDATA%\MilkTally\release-signing\`. `cloud/build-release.ps1` uses them for repeatable release builds. Use `cloud/export-release-key-password.ps1` locally if you need to back up the password to your own password manager before moving development to another Windows account/device.

## Project layout

```text
index.html                         Main UI and local state/quantity logic
cloud-client.js                    Firestore listeners, refresh, submissions, tally sync
admin.html                         Owner-only sign-in and inbox UI
admin-client.js                    Owner price controls, suggestion approvals, support inbox actions
firebase-config.js                 Active public Firebase Web app config
firebase-config.example.js         Placeholder config template
firebase.json                      Firestore rules + Firebase Hosting source config
.firebaserc                        Firebase CLI project alias
cloud/firestore.rules              Firestore rules, including owner-only read/delete controls for support
cloud/initial-products.json        Product seed/reference data
cloud/initial-app-data.json        Initial UI data/reference
cloud/sync-app.ps1                 Copies source pages/config/assets to public and Android
assets/                            Product pack images used by the app
public/                            Firebase Hosting mirror; generated by sync script
android-app/                       Native Android WebView wrapper and bundled assets
outputs/Milk-tally.apk             Latest release APK output
cloud/setup-release-signing.ps1    Creates a release key with a locally entered password
cloud/build-release.ps1            Builds a release APK using local protected signing credentials
cloud/export-release-key-password.ps1  Manually exports the signing password for offline backup
```

`work/` contains local SDK/JDK downloads, build utilities, and scratch files; it is not a source-code dependency to commit. The local preview server used during development is not a production API or deployment.

## Build and local preview

Requirements: JDK 17+, Android SDK Platform 35 and Build Tools 35.0.0. This workspace has local copies under `work/temurin-jdk/` and `work/tools/android-sdk/`; another developer can use a standard installed JDK/SDK instead.

From the project root, synchronize the source into public and Android assets, then build:

```powershell
.\cloud\sync-app.ps1
cd android-app
.\gradlew.bat assembleDebug
cd ..
Copy-Item .\android-app\app\build\outputs\apk\debug\app-debug.apk .\outputs\Milk-tally.apk -Force
```

For a signed, non-debuggable APK, run `.\cloud\build-release.ps1` from the project root. It synchronizes the app, builds the release variant, and writes `outputs/Milk-tally.apk`.

To preview the main web UI locally, run `python -m http.server 8000` from the project root and open `http://localhost:8000/`. The server is only a local static preview; it is not Cloud Run or Firebase Hosting.

Firebase CLI project selection is set by `.firebaserc`. Check the active account and project before deploying. Rules deployment command:

```powershell
firebase deploy --only firestore:rules
```

Hosting source points to `public/`, but a public Hosting deploy has not been confirmed. Firebase Spark blocks `.apk` files from Firebase Hosting; use a different distribution host for APK downloads.

## Spark cost notes

Firestore has no-cost Spark quotas and no billing account is attached. Current documented Standard Firestore no-cost quotas include 1 GiB stored data, 50,000 document reads/day, 20,000 writes/day, 20,000 deletes/day, and 10 GiB/month outbound transfer; check the official [Firestore quotas](https://firebase.google.com/docs/firestore/quotas) and [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) because limits can change. If Spark quotas are exceeded, the no-billing project may stop serving some requests until the quota resets or the plan changes. Firebase Email/Password Auth is no-cost; phone SMS auth is billed and requires billing.

## Release notes

### v1.6 — Owner email stays private

Removed the owner email from the app source, login default, signed-in screen, and Firestore rules. Admin access is now checked by verified Auth UID. Added a non-debuggable release build signed with the local owner-held key.

### v1.5 — Owner review panel prepared

Added an owner-only sign-in/inbox page with price/new-product approval actions and support-message viewing. Added an Admin entry point, an email-verified owner rule, and updated the Gold 1 L offline/seed default to ₹82. The Auth provider and new rules are prepared in source but still need to be enabled/published before the panel can access production data.

### v1.4 — Reset stays visible

Moved Reset into the fixed total panel and kept it in a compact footer row above the keyboard.

### v1.2 — Manual quantities and bill sharing

Added direct quantity entry, reduced input lag, adjusted keyboard scrolling, and added the Android share-sheet bill action.
