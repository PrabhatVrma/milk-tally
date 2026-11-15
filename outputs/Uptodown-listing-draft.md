# Uptodown listing draft — Milk tally

Prepared for the Uptodown Developers Console. Do not publish until a production-signed APK is ready.

## App identity

- App name: Milk tally
- Platform: Android
- Package: com.milktally.app
- Current app version: 1.11 (versionCode 12)
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

Milk tally makes it easy to calculate the total for everyday milk and dairy purchases. Choose from Amul milk, curd, and buttermilk products, then tap the plus and minus buttons to change the count by the displayed pack step, or enter any whole quantity manually. Button changes are reflected in the quantity field, and each phone keeps its own tally. Prices retain decimal precision, including values such as ₹73.833, and totals and shared bills use those exact decimal prices. Refresh prices from the online catalog, reset your tally, and share a formatted bill through your phone's share menu, including WhatsApp. An internet connection is needed for live prices; your quantities remain saved on your device. No account is needed to use the main tally. Milk tally is an independent utility and is not affiliated with or endorsed by Amul.

## Data disclosure

The app retrieves product prices from Firebase Firestore. Quantities remain on the user's device. If users submit a suggestion or support message, the message and any optional contact detail they enter are stored for the app owner. No sign-in is required for the main tally.

## Version 1.11 release notes

- Preserve decimal price digits instead of rounding to two decimal places.
- Accept arbitrary decimal values in price suggestions and admin price editing.
- Calculate bill line totals and grand totals using decimal arithmetic.

## Version 1.10 release notes

- Update the visible quantity field when plus or minus is tapped.
- Allow manual quantities that differ from the product's button step.
- Keep each phone's tally private to that installation.

## Version 1.9 release notes

- Keep each phone's milk quantities private to that installation.
- Add and remove products using the displayed pack steps.
- Continue receiving live product prices from Firebase.

## Version 1.8 release notes

Admins can update prices directly, approve product suggestions, and mark support messages as read before deleting them. The Android app now shows a native confirmation dialog so the delete action works reliably in WebView.

## Distribution and license

- Price: Free
- In-app purchases: No
- Subscription required: No
- Ads: No
- License: Proprietary
- Development stage: Final release only after a production-signed, non-debuggable APK is built

## Release file warning

outputs/Milk-tally.apk is release-signed, non-debuggable, and ready for the Uptodown upload. Keep the signing key for future updates.


