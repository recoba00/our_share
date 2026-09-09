# FEATURE_SPEC

기능 정의서는 MVP에서 구현할 기능과 후순위 기능을 구분하고, Firebase 연동 지점을 명확히 정의한다.

## MVP 기능 범위

- Google 로그인
- 가족 생성
- 가족 초대
- 홈 대시보드
- 가족별 위치 요약
- 가족 채팅
- 비밀방 생성
- 채팅방 내 투표 생성/전송
- 투표 메뉴 내 투표 생성/참여
- 일반 메모
- 민감정보 메모
- 캘린더 일정 등록
- 매년 반복 일정
- 휴무일 체크

## Authentication

### 목적

Firebase Auth Google 로그인을 통해 가족 구성원을 식별한다.

### 주요 기능

- Google 로그인
- 로그아웃
- 로그인 상태 유지
- 사용자 프로필 동기화

### 데이터

Firestore `users` 컬렉션에 사용자 기본 정보를 저장한다.

필드:

- id
- displayName
- email
- photoURL
- createdAt
- updatedAt

## Family

### 목적

사용자가 가족 그룹을 만들고 가족 구성원을 초대할 수 있게 한다.

### 주요 기능

- 가족 생성
- 초대 코드 생성
- 초대 코드로 가족 참여
- 가족 구성원 목록 조회
- 가족 구성원 권한 관리

### 데이터

Firestore 컬렉션:

- families
- familyMembers

## Home Dashboard

### 목적

가족 구성원의 위치, 일정, 메모, 투표, 채팅 상태를 간략히 모아 보여준다.

### 주요 기능

- 가족별 위치 요약 표시
- 오늘 일정 표시
- 이달의 주요 일정 표시
- 최근 메모 표시
- 진행중 투표 표시
- 읽지 않은 채팅 표시

### Firebase 연동

- Firestore: families, familyMembers, calendarEvents, memos, polls, chatRooms, messages
- Realtime Database: liveLocations, onlinePresence, deviceStatus

## Chat

### 목적

가족 간 텍스트 대화, 가족 초대, 비밀방, 투표 공유를 지원한다.

### 주요 기능

- 가족 전체 채팅방
- 1:1 채팅방
- 비밀방 생성
- 텍스트 메시지 전송
- 읽음 상태
- 가족 초대 기능 진입
- 채팅방 안에서 투표 생성
- 투표를 채팅방 메시지로 전송

### MVP 제한

- 이미지 메시지 미지원
- 파일 업로드 미지원
- Firebase Storage 미사용

### 데이터

Firestore 컬렉션:

- chatRooms
- messages
- polls
- pollVotes

## Poll

### 목적

가족 의사결정을 투표로 만들고, 투표 메뉴와 채팅방 양쪽에서 사용할 수 있게 한다.

### 주요 기능

- 일반 투표 생성
- 날짜 투표 생성
- 단일 선택
- 복수 선택
- 익명 투표
- 마감일 설정
- 결과 공개 여부 설정
- 채팅방으로 투표 전송
- 채팅방에서 투표 참여

### 데이터

Firestore 컬렉션:

- polls
- pollVotes

Poll 필드:

- id
- familyId
- chatRoomId
- title
- description
- type
- options[]
- multipleChoice
- anonymous
- closesAt
- resultVisibility
- createdBy
- createdAt
- updatedAt

Vote 필드:

- pollId
- userId
- selectedOptions[]
- createdAt
- updatedAt

## Memo

### 목적

일반 가족 메모와 민감정보 메모를 구분해 저장하고 열람 권한을 관리한다.

### 주요 기능

- 일반 메모 작성/수정/삭제
- 민감정보 메모 작성/수정/삭제
- 민감정보 체크박스
- 열람 대상 가족 구성원 선택
- 개인 비밀번호 입력 후 민감정보 메모 열람

### 보안 원칙

- 민감정보는 일반 메모와 UI상 명확히 구분한다.
- 개인 비밀번호 원문은 저장하지 않는다.
- 단순 Frontend 비교만으로 민감정보 접근을 허용하지 않는다.
- MVP에서는 주민등록번호 등 고위험 민감정보 저장을 권장하지 않는다.

### 데이터

Firestore 컬렉션:

- memos

Memo 필드:

- id
- familyId
- title
- content
- type
- sensitive
- createdBy
- visibleTo[]
- createdAt
- updatedAt

## Calendar

### 목적

가족 일정과 반복 일정, 휴무일을 월간 캘린더에서 관리한다.

### 주요 기능

- 일정 등록
- 일정 수정/삭제
- 매년 반복 설정
- 휴무일 체크
- 가족 전체 일정
- 개인 일정
- D-Day / 기념일
- 날짜 투표 연동

### 데이터

Firestore 컬렉션:

- calendarEvents
- anniversaries

Calendar Event 필드:

- id
- familyId
- title
- description
- startAt
- endAt
- allDay
- category
- yearlyRepeat
- dayOff
- createdBy
- visibleTo
- createdAt
- updatedAt

## Location

### 목적

홈에서 가족별 현재 위치와 상태를 간략히 확인한다.

### 주요 기능

- 앱 활성 상태에서 현재 위치 공유
- 가족별 위치 요약
- 배터리 상태 표시
- 위치 업데이트 시각 표시

### MVP 제한

- 백그라운드 지속 위치 추적은 후순위
- 별도 지도 탭은 MVP 하단 네비게이션에 포함하지 않음

### 데이터

Realtime Database 경로:

```text
liveLocations/{familyId}/{userId}
```

필드:

- latitude
- longitude
- accuracy
- updatedAt
- battery
- charging

## 완료 기준

- 사용자는 Google 계정으로 로그인할 수 있다.
- 사용자는 가족을 만들고 가족 구성원을 초대할 수 있다.
- 홈에서 가족별 위치와 주요 정보를 요약 확인할 수 있다.
- 채팅방에서 텍스트 메시지를 주고받을 수 있다.
- 채팅방 또는 투표 메뉴에서 투표를 만들 수 있다.
- 생성된 투표를 채팅방으로 전송할 수 있다.
- 일반 메모와 민감정보 메모를 구분해 작성할 수 있다.
- 민감정보 메모는 개인 비밀번호 확인 이후 열람된다.
- 캘린더에서 일정 등록, 매년 반복, 휴무일 체크가 가능하다.
