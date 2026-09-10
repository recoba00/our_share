# Firebase Security Audit

Date: 2026-09-10

## Assessment

```json
{
  "score": 4,
  "summary": "MVP Firestore rules now block the largest membership and update-bypass risks. Remaining risks are mostly operational: rules are not yet published/tested with the emulator, RTDB membership mirror still relies on client writes until Admin SDK or Cloud Functions synchronization is added, and user profile reads are still broad for MVP family member display.",
  "findings": [
    {
      "check": "Authority Source",
      "severity": "minor",
      "issue": "Realtime Database membership mirror can still be written by clients for MVP compatibility.",
      "recommendation": "Move mirror writes to Cloud Functions or Admin SDK and disable client writes to familyMembers in RTDB before production."
    },
    {
      "check": "Business Logic vs. Rules",
      "severity": "minor",
      "issue": "Rules are updated locally but not yet published to Firebase Console.",
      "recommendation": "Publish Firestore and Realtime Database rules, then run a manual smoke test for login, family create, invite join, location share, chat, memo, calendar, and poll."
    },
    {
      "check": "Field-Level vs. Identity-Level Security",
      "severity": "minor",
      "issue": "User profile documents remain readable by signed-in users so family member cards can resolve names and photos.",
      "recommendation": "Introduce a family-scoped public profile mirror or userFamilies ACL if profile privacy needs to be stricter."
    }
  ]
}
```

## Changes Applied

- `families` list/read access was reduced to existing family members.
- `familyInvites/{inviteCode}` was introduced for single invite-code lookup without listing all families.
- `familyMembers` create rules now require either owner bootstrapping or a matching invite index.
- Calendar, memo, poll, chat room, message, and poll vote writes now include field allowlists and basic size/type guards.
- Chat room metadata updates are limited to last-message fields.
- Message updates are limited to read status and cannot change message content, author, room, or family.
- RTDB membership and location validation rules were tightened within current MVP constraints.

## Still Required

- Publish the updated rules in Firebase Console.
- Add Firebase emulator rules tests.
- Replace client-written RTDB membership mirror with Admin SDK or Cloud Functions synchronization.
