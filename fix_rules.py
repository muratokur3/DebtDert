import re

with open("firestore.rules", "r") as f:
    text = f.read()

bad_block = """      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.participants
        // Check 1: Creator must be in participants (Already covered)

        // Check 2: The OTHER participant must not have blocked ME.
        // Since we can't loop, we check for every participant P in the list:
        // IF P != auth.uid, THEN check if /users/P/blockedUsers/auth.uid exists.
        // Firestore rules don't support looping, but for a fixed list size (2) we could try.
        // But participants is an array.

        // Alternative: We trust the client for the "I blocked them" check (which we do in code).
        // We enforce "They blocked me" check here?
        // Checking "exists(/databases/$(database)/documents/users/$(otherUid)/blockedUsers/$(request.auth.uid)) == false"
        // But extracting otherUid is hard.

        // Simplification: We will rely on Cloud Functions or strict client checks + minimal rule support.
        // Ideally, we'd use a function trigger to validate blocking and delete/reject if found.
        // For now, we will stick to the basic rules and rely on client + backend-like service checks if possible.
        // But the prompt ASKED to "Update security rules... if possible".
        // Let's at least keep the participant check strong.
        ;
        && request.auth.uid == request.resource.data.createdBy
        // 1. Rate Limiting (30s between debt creations)
        && (!exists(/databases/$(database)/documents/users/$(request.auth.uid)/metadata/rateLimit) ||
            request.time > get(/databases/$(database)/documents/users/$(request.auth.uid)/metadata/rateLimit).data.lastDebtCreated + duration.value(30, 's'))
        // 2. Ensure the user is updating their rateLimit metadata in the same batch
        && getAfter(/databases/$(database)/documents/users/$(request.auth.uid)/metadata/rateLimit).data.lastDebtCreated == request.time;"""

good_block = """      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.participants
        && request.auth.uid == request.resource.data.createdBy
        // 1. Rate Limiting (30s between debt creations)
        && (!exists(/databases/$(database)/documents/users/$(request.auth.uid)/metadata/rateLimit) ||
            request.time > get(/databases/$(database)/documents/users/$(request.auth.uid)/metadata/rateLimit).data.lastDebtCreated + duration.value(30, 's'))
        // 2. Ensure the user is updating their rateLimit metadata in the same batch
        && getAfter(/databases/$(database)/documents/users/$(request.auth.uid)/metadata/rateLimit).data.lastDebtCreated == request.time;"""

text = text.replace(bad_block, good_block)

with open("firestore.rules", "w") as f:
    f.write(text)
