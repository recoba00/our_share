# MVP Release Checklist

Date: 2026-09-10

## Automated Checks

- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:dist`
- [x] `npm run test:dist:firebase`
- [x] `npm run test:rules`
- [x] `npm run test:hosting`
- [x] `npm run test:mvp`
- [x] GitHub Actions runs hosting smoke check after Dothome FTP deploy
- [x] GitHub Actions runs lint and Firestore Rules tests before Dothome FTP deploy
- [x] GitHub Actions verifies Firebase Hosting candidate build before Dothome FTP deploy
- [x] Firebase Firestore Rules published
- [x] Firebase Realtime Database Rules published
- [x] Firestore and Realtime Database Rules covered by local emulator tests
- [x] Dothome root URL returns built Vite HTML
- [x] Dothome SPA route fallback returns 200
- [x] Dothome manifest returns explicit `Content-Type`
- [x] Firebase subscription errors surface in page status messages
- [x] Runtime render errors show a recoverable fallback screen
- [x] Diagnostics route exposes hosting, Firebase, browser, and location status
- [x] Diagnostics route shows deployed build commit and build time
- [x] Diagnostics route includes local MVP smoke checklist tracking
- [x] Diagnostics route includes live MVP write-permission probe
- [x] Diagnostics route includes Realtime Database location write probe

## Manual Web Smoke Test

Run from:

- `http://recoba00.dothome.co.kr/our_share/`
- `http://recoba00.dothome.co.kr/our_share/diagnostics`

Test account:

- Google login with an allowed Firebase Auth domain.

Checklist:

- [ ] Diagnostics route loads and shows expected Firebase project
- [ ] Diagnostics route build commit matches latest GitHub commit
- [ ] Diagnostics write-permission probe passes after login and family membership
- [ ] Diagnostics write-permission probe passes Realtime Database location write
- [ ] Diagnostics write-permission probe passes family room and direct room preparation
- [ ] Google login succeeds
- [ ] Logout succeeds
- [ ] Create a family
- [ ] Confirm invite code appears
- [ ] Join family with invite code from another account
- [ ] Family member list appears
- [ ] OWNER can change member role
- [ ] Current location share succeeds after browser permission
- [ ] Family location card appears
- [ ] Quick message sends to family chat
- [ ] Create public memo
- [ ] Create sensitive memo with password
- [ ] Sensitive memo opens with correct password
- [ ] Sensitive memo rejects wrong password
- [ ] Create calendar event
- [ ] Create yearly recurring event
- [ ] Create day-off event
- [ ] Create calendar date poll
- [ ] Create general poll
- [ ] Vote on poll
- [ ] Send poll to chat room
- [ ] Family room text message sends
- [ ] Direct chat room opens
- [ ] Private group room opens
- [ ] Read status updates
- [ ] Today browser notification permission flow works on localhost or HTTPS

## Release Decision

MVP can be considered 100% ready for Firebase Hosting migration when:

- Automated checks pass.
- Manual smoke test passes without blocking permission errors.
- Any Firebase Auth authorized-domain issue is resolved.
- Dothome manifest MIME type is confirmed after deployment.
