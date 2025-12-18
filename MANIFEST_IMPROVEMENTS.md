# Improvement Manifest - DebtDert

## 1. User Persona & Scenarios

### Persona: "Precise Pelin" vs "Harasser Hakan"

**Precise Pelin**:
- She is very organized.
- She wants to clear old debts that she knows will never be paid (e.g., small change left over).
- She wants to remove a wrong entry she just made.

**Harasser Hakan**:
- He keeps adding fake debts to random numbers to annoy them.
- He sends multiple debt requests to Pelin, even though she doesn't know him.

### Scenarios

#### A. User Blocking (Safety)
**Problem**: Hakan spams Pelin with debt requests.
**Need**: Pelin needs a way to "Block" Hakan so he cannot add her to any new debts.
**Action**:
1. Pelin goes to Hakan's profile (or the debt request).
2. Clicks "Block".
3. Hakan tries to add Pelin again -> Fails.
4. Existing debts? (Decision: Existing debts remain, but no new interactions).

#### B. Debt Deletion & Forgiveness (Maintenance)
**Problem 1**: Pelin made a typo (entered 500 instead of 50).
**Action**: Since it is `PENDING` (not approved yet), she should be able to **Delete** it completely.

**Problem 2**: Hakan approved the debt, but they agreed to cancel it.
**Action**: If `ACTIVE`, can it be deleted? Ideally, "Forgive" or "Void" is better for history, but for simplicity, if both agree or if the creator wants to write it off, we need a flow.
**Decision**:
- `PENDING`: Creator can DELETE. Receiver can REJECT.
- `ACTIVE`: Creator can FORGIVE (mark as paid/gift). Deletion might be dangerous for audit, but we will allow "Voiding".

## 2. Technical Implementation Plan

### 2.1. Blocking System
- **Firestore Structure**: `users/{userId}/blockedUsers/{targetUserId}`.
- **Rules**:
  - `create` debt: Check if `request.auth.uid` is in `users/{targetUid}/blockedUsers`.
  - *Challenge*: Firestore rules cannot easily "read" a collection of the target user without exact ID knowledge. We might need to store `blockedBy` in the user's document or check it during the transaction.
  - *Better Approach*: When creating a debt involving `phoneNumber`, we look up the user. If that user has blocked the creator, the service should fail.
  - *Firestore Rule*:
    ```
    allow create: if !exists(/databases/$(database)/documents/users/$(targetUid)/blockedUsers/$(request.auth.uid));
    ```
    (Note: This requires `targetUid` to be known at creation time. Since we use phone numbers, the lookup happens in the backend/client. We must ensure the client resolves the phone to a UID first).

### 2.2. Debt Actions
- **Delete (Cancel)**:
  - Only allowed if status is `PENDING`.
  - Only creator can delete.
- **Reject**:
  - Only receiver can reject.
  - Status becomes `REJECTED`.
- **Forgive (Silme/Hibe)**:
  - If `ACTIVE`.
  - Creator can mark as `FORGIVEN` (effectively Paid 0 or Paid Full by Creator).

## 3. Execution Log

- [ ] Analyze current `debtService.ts`.
- [ ] Create `blockService.ts`.
- [ ] Update `firestore.rules`.
- [ ] Update UI to show Block/Delete options.
