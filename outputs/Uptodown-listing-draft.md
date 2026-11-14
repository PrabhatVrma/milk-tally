# Uptodown listing draft — Milk tally

Prepared for the Uptodown Developers Console. Do not publish until a production-signed APK is ready.

## App identity

- App name: Milk tally
- Platform: Android
- Package: com.milktally.app
- Current app version: 1.6 (versionCode 7)
- Minimum Android version: Android 6.0 / API 23
- Category suggestion: Tools
- Language: English
- Country distribution: leave unrestricted unless the owner requests otherwise
- Public author name: Milk tally
- Official website: none configured
- Icon: use the launcher icon embedded in the APK
- Screenshots/banner: optional in the submission guide; no store screenshots have been prepared

## Short description (under 70 characters)

Fast milk and dairy tally with live prices and bill sharing.

## Full description

Milk tally makes it easy to calculate the total for everyday milk and dairy purchases. Choose from Amul milk, curd, and buttermilk products, then tap the plus and minus buttons or enter quantities directly. The rupee total updates as you go, so you can check the bill instantly. Refresh product prices from the shared online catalog, reset the tally when you're done, and share a formatted bill through your phone's share menu, including WhatsApp. An internet connection is needed for shared prices and tally synchronization; quantities remain available on the device as a fallback. No account is needed to use the main tally. Milk tally is an independent utility and is not affiliated with or endorsed by Amul.

## Data disclosure

The app shares product quantities and online price data through Firebase Firestore. If users submit a suggestion or support message, the message and any optional contact detail they enter are stored for the app owner. No sign-in is required for the main tally.

## Version 1.6 release notes

Removed the prefilled owner email from the admin screen and APK. Owner access is authorized by a verified Firebase Auth UID. Improved manual quantity entry, kept Reset accessible while typing, and added Firestore price refresh.

## Distribution and license

- Price: Free
- In-app purchases: No
- Subscription required: No
- Ads: No
- License: Proprietary
- Development stage: Final release only after a production-signed, non-debuggable APK is built

## Release file warning

outputs/Milk-tally.apk is now release-signed, non-debuggable, and ready for the Uptodown upload. Keep the signing key for future updates.


