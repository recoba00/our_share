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
- [x] 배포 URL 문서화
- [x] GitHub Actions `dist` 배포 workflow 구성
- [x] GitHub Repository Secrets 등록
- [x] Dothome 서버에 `dist` 폴더 내용만 업로드
- [ ] Dothome manifest MIME type 확인
- [ ] MVP 100% 완료 후 Firebase Hosting 이전
- [ ] Firebase Hosting SPA rewrite 구성
- [ ] GitHub Actions 배포 대상을 Firebase Hosting으로 교체
- [ ] Dothome 배포 workflow 비활성화 또는 제거
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
- [x] Pretendard
- [x] Phosphor Icons
- [x] Firebase 프로젝트 연결
- [x] `.env` 구성

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

## Authentication

- [x] Login UI
- [x] Google Login Action
- [x] Google Login Error Feedback
- [x] Google Login Redirect Fallback
- [x] Signup via Google Auth
- [x] Logout
- [x] Auth Guard

## Family

- [x] Family Create
- [x] Invite Code
- [x] Join Family
- [x] Family Member List
- [x] Member Permissions

## Home

- [x] Family Status Summary
- [x] This Month Calendar Summary
- [x] Recent Memo Summary
- [x] Active Poll Summary
- [x] Recent Chat Summary

## Location

- [x] Geolocation Permission
- [x] Current Location
- [x] Firebase Realtime Sync
- [x] Family Pins
- [x] Battery Status
- [x] Quick Message

## Calendar

- [x] Calendar UI
- [x] Event CRUD
- [x] Anniversary
- [x] D-Day
- [x] Calendar Vote
- [x] Schedule Create
- [x] Yearly Recurring Schedule
- [x] Holiday / Day Off Check

## Memo

- [x] Memo List
- [x] Memo CRUD
- [x] Secret Memo
- [x] visibleTo permission
- [x] Public Memo
- [x] Sensitive Memo
- [x] Sensitive Memo Checkbox
- [x] Personal Password Verification

## Poll

- [x] Poll Create
- [x] Poll Vote
- [x] Multiple Choice
- [x] Date Poll
- [x] Result
- [x] Send Poll to Chat Room

## Chat

- [x] Family Room
- [x] DM
- [x] Private Group
- [x] Secret Room
- [x] Family Invite Entry
- [x] Chat Poll Create
- [x] Send Poll to Chat Room
- [x] Read Status
- [x] Text Message Only MVP
- [ ] Image/File Upload Later

## Notification

- [x] Browser Notification Permission
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

## Post-MVP / Later

- [ ] Admin SDK Membership Mirror Sync
