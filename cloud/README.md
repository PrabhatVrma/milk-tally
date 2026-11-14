# Firebase project notes

For the complete project handoff, service map, configuration, schema, security status, cost notes, and build instructions, see [`../README.md`](../README.md).

- Firebase project: `milk-tally`, Spark plan, no billing account attached.
- Active backend: Cloud Firestore Standard, `(default)`, `asia-south1` (Mumbai).
- Main tally users do not sign in. Firebase Email/Password is prepared for the owner admin panel only and is not yet enabled.
- The local `cloud/firestore.rules` includes owner-only admin access but has not been published; verify provider/account setup before deploying.
- `firebase-config.js` is public client configuration, not a private service-account credential. Never store the owner password or private key in the repository.
