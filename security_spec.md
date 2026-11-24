# Security Specification — Daily Hub

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document under `/users/{userId}` and its subcollections (`tasks`, `transactions`, `notes`, `exchangeRates`, `reports`) must belong exclusively to `request.auth.uid == userId` with a verified email (`request.auth.token.email_verified == true`), and any `userId` / `uid` field inside the document must match `userId` and `request.auth.uid`.
2. **Temporal & Immutable Integrity**: `createdAt` must equal `request.time` on `create`, must never change on `update`, and `updatedAt` must equal `request.time` on both `create` and `update`. `userId` / `uid` is immutable after creation.
3. **Strict Schema & Boundary Enforcement**: Every string has bounded length (`maxLength`), IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), enums are strictly allowlisted, arrays (`tags`) are bounded (`<= 10`) with element type checks, and no shadow/ghost fields are accepted (`keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update).
4. **Relational Integrity for Linked Notes**: If `linkedTaskId` is provided and non-empty on a note, it must be a valid ID and the target task must exist in `/users/{userId}/tasks/{linkedTaskId}`.
5. **Financial Integrity**: Transaction `amount` must be a positive number (`> 0` and `<= 1000000000000`).

## 2. The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Cross-User Read/Write**: User A (`uidA`) attempts to read or create `/users/uidB/tasks/task1` even with `userId: "uidA"`.
2. **Unverified Email Bypass**: Authenticated user with `email_verified: false` attempts to create a task or read `/users/{uid}`.
3. **Identity Spoofing on Create**: User A attempts to create `/users/uidA/tasks/task1` with `userId: "uidB"`.
4. **Ghost / Shadow Field Injection**: User A creates a task with all valid fields plus `{ isAdmin: true }` or `{ verified: true }`.
5. **Oversized ID Poisoning**: User A attempts to create `/users/uidA/tasks/` with a 200-char or invalid-char (`../evil`) document ID.
6. **Client Timestamp Forgery**: User A attempts to create a transaction with a backdated client timestamp `createdAt` instead of `request.time`.
7. **Immutable Field Mutation**: User A attempts to update `userId` or `createdAt` on an existing task.
8. **Type Poisoning on Update**: User A updates a task's `status` to an invalid enum value (`"hacked"`) or `title` to a number `12345`.
9. **Denial-of-Wallet Oversized Content**: User A creates a note with `content` exceeding 20,000 characters or `tags` array with 15 elements.
10. **Unbounded/Type-Invalid Array Element**: User A creates a note with `tags: [123]` instead of strings.
11. **Negative or Zero Financial Amount**: User A creates a transaction with `amount: -50000` or `amount: 0`.
12. **Blanket List Query Scraping**: Unauthenticated or cross-user attempt to list `/users/uidB/transactions`.
