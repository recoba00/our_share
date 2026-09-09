# Firebase Security Rules

## 목적

MVP 기능에서 사용하는 Firebase 데이터 접근을 로그인 사용자와 가족 구성원 중심으로 제한한다.

## 적용 파일

- Firestore: `firestore.rules`
- Realtime Database: `database.rules.json`
- Firebase CLI 설정: `firebase.json`

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

## 현재 MVP 정책

- `users`: 로그인 사용자는 읽기 가능, 본인 문서만 생성/수정 가능
- `families`: 로그인 사용자는 초대 코드 조회를 위해 읽기 가능, 가족 수정/삭제는 OWNER만 가능
- `familyMembers`: 가족 구성원은 같은 가족 멤버 목록을 읽을 수 있음
- `calendarEvents`, `memos`, `polls`, `chatRooms`, `messages`: 해당 `familyId`의 가족 구성원만 접근 가능
- `pollVotes`: 투표가 속한 가족 구성원만 읽기 가능, 본인 투표만 생성/수정 가능
- `messages.readBy`: 가족 구성원은 읽음 상태만 업데이트 가능
- Realtime Database 위치/상태 데이터: 로그인 사용자는 읽기 가능, 본인 UID 경로만 쓰기 가능

## 보안 한계와 후속 작업

Realtime Database Rules는 Firestore의 `familyMembers` 컬렉션을 직접 참조할 수 없다. 따라서 현재 RTDB Rules는 본인 위치 쓰기는 제한하지만, 가족 단위 읽기 제한은 완전하지 않다.

후속 작업:

- `liveLocationMembers/{familyId}/{userId}` 또는 RTDB `familyMembers/{familyId}_{userId}` mirror 구조 추가
- 가족 생성/참여 시 RTDB membership mirror도 함께 기록
- RTDB Rules에서 mirror membership을 기준으로 가족 위치 읽기 제한
- 초대 코드 조회용 공개 인덱스 컬렉션을 분리해 `families` 전체 read 범위 축소
- Firestore Rules 테스트 추가
