# Firebase Security Rules

## 목적

MVP 기능에서 사용하는 Firebase 데이터 접근을 로그인 사용자와 가족 구성원 중심으로 제한한다.

## 적용 파일

- Firestore: `firestore.rules`
- Realtime Database: `database.rules.json`
- Firebase CLI 설정: `firebase.json`
- Firebase Project Alias: `.firebaserc`

## 배포 상태

2026-09-10에 Firebase CLI `15.30.0`으로 `our-share-6baf5` 프로젝트에 Firestore Rules와 Realtime Database Rules를 게시했다.

## Firestore 적용 방법

Firebase CLI가 설치되어 있으면 아래 명령으로 배포한다.

```bash
firebase deploy --only firestore:rules
```

CLI 없이 Firebase Console에서 적용할 수도 있다.

1. Firebase Console 접속
2. Firestore Database
3. Rules 탭
4. `firestore.rules` 내용을 붙여넣기
5. Publish

## Realtime Database 적용 방법

Firebase CLI가 설치되어 있으면 아래 명령으로 배포한다.

```bash
firebase deploy --only database
```

CLI 없이 Firebase Console에서 적용할 수도 있다.

1. Firebase Console 접속
2. Realtime Database
3. Rules 탭
4. `database.rules.json`의 `rules` 객체 내용을 기준으로 붙여넣기
5. Publish

## Firestore Rules 테스트

자동 테스트 파일:

- `tests/firestore.rules.test.ts`

실행 명령:

```bash
npm run test:rules
```

테스트 범위:

- OWNER 가족 생성 bootstrapping 허용
- 초대코드 기반 MEMBER 가입 허용
- 초대코드 없는 임의 가족 가입 차단
- 비구성원의 가족 문서 읽기 차단
- 채팅방 구성원의 메시지 생성 허용
- 비구성원의 메시지 생성 차단
- 메시지 `readBy` 업데이트 허용
- 메시지 본문 변조 차단
- 채팅방 `memberIds` 변조 차단
- 투표값 대리 작성 차단

주의:

Firestore emulator는 Java Runtime이 필요하다. 이 프로젝트의 `npm run test:rules`는 전역 Java가 없을 때 Android Studio에 포함된 JBR을 자동으로 감지해 사용한다.

## 현재 MVP 정책

- `users`: 로그인 사용자는 읽기 가능, 본인 문서만 생성/수정 가능
- `families`: 가족 구성원만 읽기 가능, 가족 수정/삭제는 OWNER만 가능
- `familyInvites`: 로그인 사용자는 초대 코드 단건 조회만 가능, 목록 조회는 차단
- `familyMembers`: 가족 구성원은 같은 가족 멤버 목록을 읽을 수 있고, 신규 MEMBER 가입은 `familyInvites`의 초대코드와 `familyId` 일치 여부를 기준으로 제한
- `calendarEvents`, `memos`, `polls`, `chatRooms`, `messages`: 해당 `familyId`의 가족 구성원만 접근 가능
- `pollVotes`: 투표가 속한 가족 구성원만 읽기 가능, 본인 투표만 생성/수정 가능
- `messages.readBy`: 가족 구성원은 읽음 상태만 업데이트 가능
- Realtime Database `familyMembers/{familyId}/{userId}`: Firestore 멤버십을 RTDB에 mirror 저장
- Realtime Database 위치/상태 데이터: RTDB membership mirror에 포함된 가족 구성원만 읽기 가능, 본인 UID 경로만 쓰기 가능

## 보안 한계와 후속 작업

Realtime Database Rules는 Firestore의 `familyMembers` 컬렉션을 직접 참조할 수 없다. 따라서 가족 생성/참여 시 RTDB `familyMembers/{familyId}/{userId}` mirror를 함께 기록하고, RTDB Rules는 이 mirror를 기준으로 가족 위치/상태 읽기를 제한한다.

현재 MVP에서는 클라이언트가 본인 UID의 membership mirror를 기록한다. 이 방식은 빠른 MVP 동작 확인용이며, 최종 보안 경계로는 충분하지 않다. 운영 단계에서는 Cloud Functions 또는 Admin SDK가 Firestore `familyMembers` 변경을 감지해 RTDB mirror를 서버 권한으로 기록하고, 클라이언트의 `familyMembers` 직접 쓰기는 차단해야 한다.

후속 작업:

- 기존 Firestore `familyMembers` 문서를 가진 사용자에 대한 RTDB mirror backfill: MVP에서는 로그인 사용자가 자신의 가족을 불러올 때 본인 mirror를 보강한다.
- Cloud Functions 또는 Admin SDK 기반 membership mirror 동기화
- 클라이언트의 RTDB `familyMembers` 직접 쓰기 차단
- 초대 코드 조회용 `familyInvites` 인덱스를 유지하고, `families` 전체 read는 차단한다.
- Firestore Rules 테스트 추가
