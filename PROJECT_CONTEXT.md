# 우리끼리 PWA

Version: 2.0

## 제품 용어 및 다중 크루 방향

사용자에게 노출되는 서비스 용어는 `그룹` 대신 `크루`를 사용한다. 크루는 가족, 친구 모임, 룸메이트, 소규모 팀까지 확장할 수 있는 상위 개념이다.
`오너`는 `크루장`, `그룹원`과 `구성원`은 `멤버`로 표시한다. `VICE_OWNER`는 `부크루장`으로 표시한다.

현재 MVP의 Firebase 컬렉션과 코드 내부 식별자는 기존 데이터 호환을 위해 `families`, `familyId`, `familyMembers`를 유지한다. 이 이름은 사용자 화면에 노출하지 않는 내부 호환 계층이다.

다중 그룹 확장 방향:

- 한 사용자는 여러 크루의 멤버가 될 수 있다.
- 크루마다 OWNER(화면에서는 크루장), VICE_OWNER(부크루장), 멤버 역할을 별도로 가진다.
- 앱 전역에 현재 선택된 `activeGroupId`를 두고 모든 일정, 메모, 투표, 채팅, 위치 구독이 이를 기준으로 동작한다.
- 기존 `familyMembers` 조인 컬렉션은 사용자별 여러 문서를 이미 표현할 수 있으므로, 현재의 단일 그룹 조회(`limit(1)`)를 다중 목록 조회로 확장한다.
- 마지막 선택 크루는 로컬 저장소에 보관하고, 크루 전환 UI는 헤더 또는 홈 상단에 배치한다.
- 데이터 마이그레이션 부담을 줄이기 위해 MVP 이후에도 Firestore 경로는 우선 유지하고, 공개 타입과 함수명부터 `Group` 계열로 단계적으로 전환한다.

## 서비스 목적

크루 멤버 간 위치 공유, 일정, 메모, 투표, 채팅 기능을 하나의 앱에서 제공하는 크루 전용 PWA.

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
- Cloud Functions: MVP에서는 에뮬레이터 테스트만 유지하고 운영 배포를 보류한다. Cloud Functions 운영 배포는 Blaze 요금제가 필요하므로 무료 Spark 운영 범위에 포함하지 않는다.

## 외부 연동

- GitHub Repository: `https://github.com/recoba00/our_share`
- Hosting URL: `https://our-share-6baf5.web.app`
- Legacy Dothome URL: `https://recoba00.dothome.co.kr/our_share`
- Hosting Migration Plan: Dothome에서 Firebase Hosting으로 전환
- Firebase Project: `our-share-6baf5`
- Firebase Auth: Google 로그인 사용
- Cloud Firestore: 서울 리전
- Realtime Database: 싱가포르 리전, `https://our-share-6baf5-default-rtdb.asia-southeast1.firebasedatabase.app`
- Firebase Storage: Spark 요금제에서는 보류
- Cloud Functions: Spark 무료 운영 정책에 따라 운영 배포 보류. `functions-deploy.yml`은 Blaze 확인 입력 없이는 실행되지 않는다.
- Firebase Web App: 생성 완료
- Kakao Map JavaScript API: `VITE_KAKAO_MAP_JAVASCRIPT_KEY` 사용
- Kakao 플랫폼 허용 도메인: `http://localhost:5173`, `https://our-share-6baf5.web.app`

Kakao Map 배포 주의:

- GitHub Actions Repository Secret `VITE_KAKAO_MAP_JAVASCRIPT_KEY`를 Hosting 빌드에 주입한다.
- Kakao Developers의 Web 플랫폼에 로컬·Firebase Hosting 도메인을 모두 등록해야 한다.
- SDK 또는 위치값이 유효하지 않으면 기본 위치 영역과 안내 문구를 표시한다.

## 호스팅 전략

Firebase Hosting을 기본 배포 대상으로 사용한다.

Dothome 정적 호스팅과 GitHub Actions FTP 배포는 이전 배포 방식으로 보관한다.

이전 이유:

- Firebase Hosting은 HTTPS가 기본 제공되어 PWA, 서비스 워커, 브라우저 알림 제약을 줄일 수 있다.
- Firebase Auth 승인 도메인, Firestore, Realtime Database와 같은 Firebase 생태계 안에서 관리할 수 있다.
- SPA rewrite와 CDN 배포를 Firebase 설정으로 일관되게 관리할 수 있다.

전환 상태:

- `firebase.json` Hosting 설정은 추가 완료
- Vite `base` 경로는 Dothome 기본 `/our_share/`, Firebase Hosting 빌드 `/`로 전환 가능
- Firebase Hosting SPA rewrite 설정 완료
- GitHub Actions 배포 대상을 Firebase Hosting으로 교체 완료
- Dothome 배포 workflow 비활성화 완료
- Firebase Auth 승인 도메인 확인 필요

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
- anniversaries

가족별 MVP 기능 데이터는 가족 문서 하위 컬렉션으로 저장한다.

```text
families/{familyId}/calendarEvents/{eventId}
families/{familyId}/memos/{memoId}
families/{familyId}/polls/{pollId}
families/{familyId}/pollVotes/{voteId}
families/{familyId}/chatRooms/{roomId}
families/{familyId}/messages/{messageId}
```

이 구조는 Firestore Security Rules에서 `familyId`를 경로 기준으로 검증해 목록 조회와 저장 권한을 안정적으로 처리하기 위한 MVP 기준 구조다.

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
- VICE_OWNER
- PARENT
- MEMBER
- CHILD

### Realtime Database

사용 경로:

- liveLocations
- onlinePresence
- deviceStatus
- familyMembers

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
- OWNER는 크루명·멤버·초대·크루 삭제를 관리할 수 있다.
- VICE_OWNER는 초대 기능을 사용할 수 있지만 멤버 관리와 크루 삭제는 할 수 없다. 크루당 최대 2명이다.
- MEMBER는 크루 데이터를 이용할 수 있지만 크루 관리 권한은 없다.

### Firestore / Realtime Database 동기화 정책

MVP에서는 가족 구성원 원본 데이터를 Firestore `familyMembers/{familyId}_{userId}`에 저장하고, Realtime Database 위치 권한 검사를 위해 `familyMembers/{familyId}/{userId}` mirror를 함께 유지한다.

MVP 클라이언트 동작:

- 가족 생성 시 Firestore membership과 RTDB mirror를 함께 생성한다.
- 초대 코드 참여 시 Firestore membership 생성 후 RTDB mirror를 best-effort로 생성한다.
- 가족 구성원 역할 변경 시 Firestore membership과 RTDB mirror role을 함께 갱신한다.
- 크루장 승계 시 기존 OWNER를 VICE_OWNER로 바꾸고 새 OWNER를 같은 Firestore batch로 저장한다.
- OWNER가 구성원을 삭제할 때 Firestore membership 삭제 후 RTDB mirror도 삭제한다.
- 기존 membership에 mirror가 없으면 앱 구독 시 best-effort backfill을 수행한다.

Post-MVP 서버 전환 정책:

- Cloud Functions for Firebase와 Admin SDK를 사용해 Firestore membership 변경을 RTDB mirror로 자동 동기화한다.
- 클라이언트는 Firestore membership만 작성하고, RTDB mirror 직접 쓰기는 제거한다.
- `onCreate`, `onUpdate`, `onDelete` 트리거로 RTDB `familyMembers/{familyId}/{userId}`를 생성/갱신/삭제한다.
- 동기화 실패는 Cloud Logging에 기록하고 재시도 가능한 구조로 둔다.
- 가족 구성원 권한의 최종 원본은 계속 Firestore로 유지한다.

현재 상태:

- `functions/`에 Admin SDK 기반 membership mirror 트리거와 에뮬레이터 테스트를 추가했다.
- 실제 Functions 배포와 클라이언트 직접 mirror 쓰기 제거는 Blaze 요금제 전환을 결정한 뒤 진행한다.
- 전환 전까지는 기존 클라이언트 mirror 쓰기를 유지해 위치공유가 중단되지 않도록 한다.

이 전환은 Cloud Functions 사용을 전제로 하므로 Blaze 요금제 검토 후 진행한다.

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

## 운영·컴플라이언스 기준

서비스 공개 전 사용자가 설정에서 확인할 수 있어야 하는 항목:

- 서비스 이용약관
- 개인정보 처리방침
- 위치정보 이용 안내 또는 위치정보 이용약관
- 공지사항
- 앱 버전과 배포 정보
- 회원탈퇴와 데이터 삭제 안내

가입 흐름에서는 서비스 이용약관과 개인정보 처리방침 동의를 받고, 위치 권한은 위치 공유를 시작하는 시점에 별도로 안내한다. 위치 권한을 거절해도 일정·메모·투표·채팅 기능은 사용할 수 있어야 한다.

현재 앱의 정책 문서는 MVP 초안이다. 정식 공개 전 운영자명·사업자 정보·문의 채널·보유기간·파기 절차·개인정보 보호책임자 정보를 실제 운영 정보로 교체하고 법률 검토를 진행한다.
