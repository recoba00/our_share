# TODO

## 문서 / 기획

- [x] 화면 기획서 작성: `SCREEN_SPEC.md`
- [x] 기능 정의서 작성: `FEATURE_SPEC.md`

## 개발 순서

- [x] Phase 01: 프로젝트 초기 세팅
- [x] Phase 02: Design System / Common UI
- [x] Phase 03: Firebase 연결
- [x] Phase 04: Authentication
- [x] Phase 05: Family 생성 / 초대
- [x] Phase 06: Home Dashboard
- [x] Phase 07: Map / Location
- [x] Phase 08: Calendar
- [x] Phase 09: Memo
- [x] Phase 10: Poll
- [x] Phase 11: Notification
- [x] Phase 12: Chat
- [x] Phase 13: Security 강화

## Git / Hosting

- [x] Git 저장소 초기화
- [x] `.gitignore` 구성
- [x] GitHub 원격 저장소 연결: `https://github.com/recoba00/our_share`
- [x] 초기 커밋 생성
- [x] GitHub 원격 저장소 push
- [x] 서버 호스팅 제공자 결정: Dothome
- [x] Dothome 호스팅 경로 연결: `http://recoba00.dothome.co.kr/our_share`
- [x] 배포 환경 변수 구성
- [x] 빌드/배포 명령 확인
- [x] 배포 산출물 경로 검증 스크립트 구성
- [x] MVP 최종 점검 통합 명령 구성
- [x] 배포 URL 문서화
- [x] GitHub Actions `dist` 배포 workflow 구성
- [x] GitHub Actions Firebase Hosting 후보 빌드 검증 구성
- [x] GitHub Repository Secrets 등록
- [x] Dothome 서버에 `dist` 폴더 내용만 업로드
- [x] Dothome manifest MIME type 확인
- [x] MVP 100% 완료 후 Firebase Hosting 이전
- [x] Firebase Hosting SPA rewrite 구성
- [x] GitHub Actions 배포 대상을 Firebase Hosting으로 교체
- [x] Dothome 배포 workflow 비활성화 또는 제거
- [x] Firebase 프로젝트 생성
- [x] Firebase Console에서 기본 설정 진행
- [x] Firebase Web App 생성
- [x] Firebase Auth Google 로그인 활성화
- [x] Cloud Firestore 서울 리전 활성화
- [x] Realtime Database 싱가포르 리전 활성화
- [x] Firebase Storage 보류 정책 반영
- [x] Firebase 설정값 `.env` 구성
- [x] Realtime Database `databaseURL` 확인 후 `.env`에 추가

## Initial

- [x] React + TypeScript + Vite
- [x] Tailwind 설정
- [x] PWA 설정
- [x] PWA App Icon
- [x] PWA PNG App Icons
- [x] PWA Cache Version Bump for App Icon Refresh
- [x] PWA Install Prompt Bottom Sheet
- [x] PWA Update Prompt
- [x] Pretendard
- [x] Phosphor Icons
- [x] Firebase 프로젝트 연결
- [x] `.env` 구성
- [x] Firestore Persistent Local Cache

## Design System

- [x] Design Token
- [x] Slate Neutral Palette
- [x] Emerald 500 Brand Token
- [x] Brand Color Swap Structure
- [x] 4pt Grid System
- [x] Responsive Layout: 1440 Desktop
- [x] Responsive Layout: Tablet
- [x] Responsive Layout: Mobile
- [x] Pretendard Font
- [x] Phosphor Icons
- [x] Button
- [x] Input
- [x] Card
- [x] Avatar
- [x] Modal
- [x] Bottom Sheet
- [x] Toast
- [x] Bottom Navigation
- [x] Figma Handoff Ready Token Structure
- [x] Desktop feature pages use a consistent left-side action panel
- [x] Mobile feature pages separate create forms into full-screen action layers
- [x] Floating action button bottom safe spacing
- [x] Header title matches active bottom navigation tab outside Home
- [x] Header notification list entry
- [x] Header profile entry opens My Info
- [x] Header profile black 4% inside border
- [x] Header icon actions support unboxed ghost style
- [x] Header group switcher uses shared Bottom Sheet with immediate selection
- [x] App / modal / bottom sheet header height fixed to 64px
- [x] App / modal / bottom sheet header title typography unified
- [x] Fixed glass header
- [x] Glass bottom navigation with safe area
- [x] Bottom Navigation Scroll To Top
- [x] Hide bottom navigation on second-depth screens
- [x] Scroll-aware compact floating action buttons
- [x] 400/600 font-weight token normalization
- [x] Mobile zoom prevention for field focus
- [x] Horizontal overflow prevention on responsive layouts
- [x] Family Loading State Separation
- [x] Strong gradient surfaces simplified to neutral/brand-soft surfaces

## Authentication

- [x] Login UI
- [x] Google Login Action
- [x] Google Login Error Feedback
- [x] Google Login Redirect Fallback
- [x] Signup via Google Auth
- [x] My Info Profile Page
- [x] Nickname Update
- [x] Profile Image URL Update
- [x] Settings Page Entry
- [x] Logout
- [x] Auth Guard

## Family

- [x] Family Create
- [x] Invite Code
- [x] Join Family
- [x] Family Member List
- [x] Member Permissions
- [x] Owner Member Delete

## Home

- [x] Family Status Summary
- [x] This Month Calendar Summary
- [x] Recent Memo Summary
- [x] Active Poll Summary
- [x] Recent Chat Summary
- [x] Location Share Toggle / Stop
- [x] Invite Code Placeholder Join Form
- [x] Home Group Action and Status Order
- [x] Home Status Before Invite Section
- [x] Invite Code Input and Join Button Spacing

## Location

- [x] Geolocation Permission
- [x] Current Location
- [x] Firebase Realtime Sync
- [x] Family Pins
- [x] Battery Status
- [x] Quick Message

## Calendar

- [x] Calendar UI
- [x] Calendar Day 1:1 Ratio
- [x] Event CRUD
- [x] Calendar Event Delete
- [x] Calendar Dot Event Markers
- [x] Calendar Dot Count Touch Target
- [x] Calendar Event Detail Dialog
- [x] Date Click Opens Event Form
- [x] Mobile Full-Screen Event Form
- [x] Calendar Event/Poll Tabbed Create Panel
- [x] Anniversary
- [x] D-Day
- [x] Calendar Vote
- [x] Schedule Create
- [x] Yearly Recurring Schedule
- [x] Holiday / Day Off Check

## Memo

- [x] Memo List
- [x] Memo CRUD
- [x] Memo Delete
- [x] Mobile Full-Screen Memo Form
- [x] Secret Memo
- [x] visibleTo permission
- [x] Public Memo
- [x] Sensitive Memo
- [x] Sensitive Memo Checkbox
- [x] Personal Password Verification

## Poll

- [x] Poll Create
- [x] Poll Delete
- [x] Poll Vote
- [x] Multiple Choice
- [x] Date Poll
- [x] Result
- [x] Send Poll to Chat Room

## Chat

- [x] Family Room
- [x] Mobile Chat Room List to Detail Navigation
- [x] Mobile Chat Room Back Header
- [x] Mobile Chat Room Header Name
- [x] Messenger Style Chat Detail Layout
- [x] Chat Message Edit
- [x] Chat Message Delete
- [x] Chat Room Inline Poll Create Layer
- [x] DM
- [x] Private Group
- [x] Secret Room
- [x] Chat Room Delete
- [x] Mobile Full-Screen Room Form
- [x] Family Invite Entry
- [x] Chat Poll Create
- [x] Send Poll to Chat Room
- [x] Read Status
- [x] Text Message Only MVP
- [ ] Image/File Upload Later

## Notification

- [x] Browser Notification Permission
- [x] Header Notification List
- [x] Today Calendar Reminder
- [x] Poll Closing Soon Reminder
- [x] Duplicate Reminder Guard
- [ ] Push Notification with Cloud Functions Later

## Security

- [x] Firestore Rules Draft
- [x] Realtime Database Rules Draft
- [x] Firebase Rules Deployment Guide
- [x] Firebase Console Rules Publish
- [x] Realtime Database Membership Mirror
- [x] Realtime Database Membership Backfill
- [x] Family Invite Index
- [x] Firebase Rules Security Audit
- [x] Firestore Rules Update Bypass Guard
- [x] Firestore Rules Field Size Guard
- [x] Firestore Rules Test Harness
- [x] Java Runtime for Firebase Emulator
- [x] Firestore Rules Test
- [x] Realtime Database Rules Test

## Post-MVP / Later

## Multi-Group Expansion

- [x] `getFirstFamilyForUser`를 사용자 소속 그룹 전체를 반환하는 조회로 확장
- [x] 그룹 목록과 현재 선택 그룹(`activeGroupId`) 상태 추가
- [x] 헤더 또는 홈 상단 그룹 전환 UI 추가
- [x] 그룹 생성/초대/탈퇴/삭제를 현재 선택 그룹 기준으로 분리
- [x] 그룹 전환 시 일정·메모·투표·채팅·위치 구독 재연결
- [x] 내 정보에서 그룹 목록·이름 수정·삭제 제공
- [x] 홈의 그룹 초대 코드 복사와 그룹 관리 이동 제공
- [x] 내 정보 탭을 `MY | 그룹`으로 분리
- [x] 내 정보 탭 UI를 캘린더 등록 탭과 동일한 세그먼트 스타일로 통일
- [x] 홈에서 초대 코드로 그룹 참여 제공
- [x] 홈 헤더에 그룹명과 아래 방향 아이콘 형태의 그룹 전환 표시
- [ ] 다중 그룹 권한과 그룹별 OWNER 관리 테스트 추가

- [ ] Admin SDK Membership Mirror Sync
  - [ ] Blaze 요금제 전환 여부 결정
  - [ ] Cloud Functions 코드베이스 추가
  - [ ] Firestore `familyMembers` onCreate 트리거로 RTDB mirror 생성
  - [ ] Firestore `familyMembers` onUpdate 트리거로 RTDB mirror role 갱신
  - [ ] Firestore `familyMembers` onDelete 트리거로 RTDB mirror 삭제
  - [ ] 클라이언트의 RTDB membership mirror 직접 쓰기 제거
  - [ ] Functions emulator 기반 동기화 테스트 추가
