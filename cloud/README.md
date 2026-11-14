# Firebase project notes

For the complete project handoff, service map, configuration, schema, security status, cost notes, and build instructions, see [`../README.md`](../README.md).

- Firebase project: `milk-tally`, Spark plan, no billing account attached.
- Active backend: Cloud Firestore Standard, `(default)`, `asia-south1` (Mumbai).
- Main tally users do not sign in. Firebase Email/Password is enabled for the owner admin panel only.
- Published rules provide owner-only admin access. The verified owner can mark support messages read and delete only messages with a `readAt` timestamp; anonymous clients cannot read or delete support messages.
- `firebase-config.js` is public client configuration, not a private service-account credential. Never store the owner password or private key in the repository.
