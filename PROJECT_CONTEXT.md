# 우리 가족 스마트 홈 PWA

Version: 2.0

## 서비스 목적

가족 구성원 간 위치 공유, 일정, 메모, 투표, 채팅 기능을 하나의 앱에서 제공하는 가족 전용 PWA.

초기 MVP는 빠른 개발과 검증을 우선한다. 단, 추후 React Native, Capacitor, Native 앱 전환 가능성을 고려하여 UI와 데이터 접근 레이어를 분리한다.

## 핵심 목표

- 가족 구성원의 현재 위치 및 상태 확인
- 가족 일정과 기념일 통합 관리
- 가족 전체 또는 특정인 대상 메모 공유
- 날짜/일반 안건 투표
- 가족 단체/개인 채팅
- 민감정보에 대한 별도 보안 레이어 적용

## 기술 스택

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- PWA
- React Router
- TanStack Query 권장
- Zustand 권장

### UI

- Tailwind CSS 기반
- Pretendard
- Phosphor Icons
- 4pt Grid System
- 반응형 레이아웃: 1440px desktop, tablet, mobile 고려
- Slate 기반 neutral palette
- Brand color: Emerald 500
- Brand color는 CSS Variable / Tailwind Theme Token으로 관리하여 추후 한 번에 변경 가능하게 구성
- Figma 디자인 연동 전까지 Codex가 기본 디자인 시스템을 선제 구축
- 추후 Figma 디자인이 확정되면 기존 토큰/컴포넌트 구조에 맞춰 반영

### Backend

Firebase 사용.

- Firebase Auth: 이메일 로그인 또는 소셜 로그인, 가족 구성원 사용자 식별
- Firestore: 일반 앱 데이터 저장
- Realtime Database: 실시간 위치, 접속 상태, 기기 상태 저장
- Firebase Storage: MVP에서는 사용하지 않고 후순위로 보류
- Cloud Functions: 알림 발송, 민감정보 서버 처리, 가족 초대 처리, 예약 알림

## 외부 연동

- GitHub Repository: `https://github.com/recoba00/our_share`
- Hosting URL: `https://recoba00.dothome.co.kr/our_share`
- Hosting Migration Plan: MVP 100% 완료 후 Dothome에서 Firebase Hosting으로 이전
- Firebase Project: `our-share-6baf5`
- Firebase Auth: Google 로그인 사용
- Cloud Firestore: 서울 리전
- Realtime Database: 싱가포르 리전, `https://our-share-6baf5-default-rtdb.asia-southeast1.firebasedatabase.app`
- Firebase Storage: Spark 요금제에서는 보류
- Firebase Web App: 생성 완료

## 호스팅 전략

MVP 개발 중에는 Dothome 정적 호스팅과 GitHub Actions FTP 배포를 사용한다.

MVP 100% 완료 후에는 Firebase Hosting으로 이전한다.

이전 이유:

- Firebase Hosting은 HTTPS가 기본 제공되어 PWA, 서비스 워커, 브라우저 알림 제약을 줄일 수 있다.
- Firebase Auth 승인 도메인, Firestore, Realtime Database와 같은 Firebase 생태계 안에서 관리할 수 있다.
- SPA rewrite와 CDN 배포를 Firebase 설정으로 일관되게 관리할 수 있다.

이전 시점에 필요한 작업:

- `firebase.json`에 Hosting 설정 추가
- Vite `base` 경로를 Firebase Hosting 배포 경로에 맞게 재검토
- Firebase Hosting SPA rewrite 설정
- Firebase Auth 승인 도메인 확인
- GitHub Actions 배포 대상을 Dothome FTP에서 Firebase Hosting으로 교체
- Dothome 배포 workflow 비활성화 또는 제거

## 앱 정보 구조

Bottom Navigation:

1. 홈
2. 채팅
3. 투표
4. 메모
5. 캘린더

보조 메뉴:

- 가족 관리
- 설정

위치는 별도 하단 탭으로 분리하지 않고 홈에서 가족별 현재 위치와 상태를 요약 제공한다.

## 주요 화면

### 홈

가족 대시보드.

표시 정보:

- 가족별 현재 위치와 상태
- 오늘 일정
- 이달의 캘린더 일정 요약
- D-Day / 기념일
- 최근 공유 메모
- 진행중 투표
- 읽지 않은 메시지

### 지도

가족 구성원의 위치를 지도 Pin 형태로 표시한다.

Pin 정보:

- 프로필
- 이름
- 배터리
- 위치 업데이트 시각

Pin 선택 시 Bottom Sheet 정보:

- 이름
- 현재 위치
- 위치 업데이트 시간
- 배터리
- 충전 여부

Quick Message:

- 어디야?
- 언제 와?
- 오는 길에 마트 들러줘!
- 메시지 보내기

위치 데이터 구조:

```text
liveLocations/{familyId}/{userId}
```

필드 예시:

- latitude
- longitude
- accuracy
- updatedAt
- battery
- charging

PWA의 백그라운드 위치 업데이트는 OS 제약이 있으므로 MVP에서는 앱 활성 상태 위치 공유를 우선 구현한다. 백그라운드 지속 위치 추적이 반드시 필요할 경우 React Native, Capacitor, Native 앱 전환을 검토한다.

### 일정

기능:

- 월간 캘린더
- 일정 등록
- 가족 전체 일정
- 개인 일정
- 기념일
- D-Day
- 투표 연동

Calendar Event 필드:

- id
- familyId
- title
- description
- startAt
- endAt
- allDay
- category
- createdBy
- visibleTo
- createdAt
- updatedAt

category:

- FAMILY
- PERSONAL
- ANNIVERSARY
- BIRTHDAY
- ETC

### 기념일

종류:

- 생일
- 결혼기념일
- 제사
- 가족 행사
- 사용자 지정

표시:

- D-100
- D-30
- D-7
- D-Day

반복 설정:

- 매년
- 음력 지원은 후순위 기능

### 공유 메모

메모 타입:

- PUBLIC: 가족 전체 열람/편집 가능
- SECRET: 특정 가족 구성원만 열람 가능

Memo 필드:

- id
- familyId
- title
- content
- type
- createdBy
- visibleTo[]
- createdAt
- updatedAt

### 투표

투표 타입:

- GENERAL
- DATE

기능:

- 단일 선택
- 복수 선택
- 익명 여부
- 마감일
- 결과 공개 여부

Poll 필드:

- id
- familyId
- title
- description
- type
- options[]
- multipleChoice
- anonymous
- closesAt
- createdBy
- createdAt

Vote 필드:

- pollId
- userId
- selectedOptions[]

### 채팅

Chat Room 타입:

- FAMILY: 가족 전체
- DIRECT: 1:1
- PRIVATE_GROUP: 선택된 가족 구성원

초기 지원:

- 텍스트
- 읽음 상태
- 메시지 시간
- 가족 초대 기능 진입
- 비밀방 생성
- 채팅방 안에서 투표 생성 및 전송

후순위:

- 답장
- 이모지
- 이미지
- 파일
- 메시지 검색
- 메시지 삭제

## Firebase 데이터 구조

### Firestore

사용 컬렉션:

- users
- families
- familyInvites
- familyMembers
- calendarEvents
- anniversaries
- memos
- polls
- pollVotes
- chatRooms
- messages

families 필드:

- id
- name
- ownerId
- inviteCode
- createdAt

familyInvites 필드:

- inviteCode
- familyId
- name
- ownerId
- createdAt

초대 참여는 `familyInvites/{inviteCode}` 단건 조회를 통해 가족을 찾는다. `families` 컬렉션 전체 조회는 보안 규칙에서 허용하지 않는다.

familyMembers 필드:

- familyId
- userId
- role
- nickname
- relation
- permissions

role:

- OWNER
- PARENT
- MEMBER
- CHILD

### Realtime Database

사용 경로:

- liveLocations
- onlinePresence
- deviceStatus

### Firebase Storage

MVP에서는 Firebase Storage를 사용하지 않는다.

이유:

- Firebase Storage 사용을 위해 Blaze 요금제 전환 필요
- MVP에서는 불필요한 과금 계정 연결을 피한다

MVP 정책:

- 프로필 이미지는 Firebase Auth Google `photoURL` 사용
- 채팅은 텍스트 메시지만 지원
- 파일/이미지 업로드 기능은 후순위

추후 Blaze 요금제 전환 시 Firebase Storage로 추가할 기능:

- 프로필 이미지 업로드
- 채팅 이미지
- 가족 공유 파일

## 권한 구조

기본 원칙:

- 모든 데이터 접근 시 `familyId` 확인 필수
- 사용자는 자신이 속한 `familyId` 데이터만 접근 가능
- PUBLIC 데이터는 가족 구성원이 접근 가능
- PRIVATE 데이터는 `visibleTo` 배열에 사용자 UID가 포함된 경우에만 접근 가능
- ADMIN/OWNER는 가족 관리 가능

## 민감정보 정책

주민등록번호 등 민감정보는 일반 Firestore 문서에 평문으로 저장하지 않는다.

가능하면 MVP에서 주민번호 저장 기능 자체를 제외한다. 추후 제공 시 별도 Secure Data 영역을 사용한다.

예시:

```text
secureFamilyData/{familyId}/members/{userId}
```

접근 조건:

- 인증된 사용자
- 해당 가족 구성원
- 별도 PIN 또는 생체인증 완료

금지 사항:

- Frontend PIN 단순 비교 방식 금지
- PIN 원문 저장 금지
- 브라우저 localStorage에 주민번호/민감정보 저장 금지
- 민감정보 암호화를 단순 AES 적용만으로 완료했다고 판단 금지

보안 설계에는 Authentication, Authorization, Firestore Security Rules, Encryption, Key Management를 모두 고려한다.

## 상태 관리

Zustand 권장.

Store 분리:

- useAuthStore
- useFamilyStore
- useLocationStore
- useUIStore

서버 데이터는 가능한 TanStack Query를 사용한다. Firebase 데이터 전체를 Zustand에 복제하지 않는다.

## MVP 범위

### Authentication

- 로그인
- 로그아웃

### Family

- 가족 생성
- 가족 초대
- 가족 구성원 목록

### Home

- 가족 상태
- 오늘 일정
- 최근 메모
- 투표

### Map

- 현재 위치 공유
- 가족 위치 표시
- 배터리 표시
- 퀵 메시지

### Calendar

- 일정 CRUD
- 기념일
- D-Day

### Memo

- 가족 메모
- 특정 사용자 비밀 메모

### Poll

- 일반 투표
- 날짜 투표
- 투표 결과

### 후순위

- 민감정보 보관
- 파일/이미지 업로드
- 백그라운드 위치
- AI 기능
