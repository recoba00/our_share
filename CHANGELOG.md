# CHANGELOG

Codex가 작업한 내용을 날짜별로 누적 기록한다.

## 2026-09-09

- 초기 기획 문서를 `PROJECT_CONTEXT.md`, `TODO.md`, `CHANGELOG.md`, `CODING_RULES.md` 4개 파일로 분리했다.
- Git 저장소 및 서버 호스팅 연동 필요 항목을 `TODO.md`에 추가했다.
- 로컬 Git 저장소를 초기화하고 기본 `.gitignore`를 추가했다.
- 초기 문서 정리 커밋을 생성했다.
- GitHub 저장소 URL, Dothome 호스팅 URL, Firebase 프로젝트 생성 예정 상태를 문서에 반영했다.
- Git 원격 저장소 `origin`을 `https://github.com/recoba00/our_share.git`로 연결했다.
- 로컬 `master` 브랜치를 GitHub `origin/master`로 push했다.
- Firebase CLI가 현재 환경에 설치되어 있지 않음을 확인했다.
- Firebase Storage를 Spark 요금제 MVP 필수 설정에서 제외하고 보류 정책으로 변경했다.
- Firebase Auth Google 로그인, Cloud Firestore 서울 리전, Realtime Database 싱가포르 리전 설정 상태를 문서에 반영했다.
- Firebase Web App 설정값을 로컬 `.env`에 추가하고, Git 공유용 `.env.example`을 생성했다.
- Firebase 프로젝트 ID를 `our-share-6baf5`로 문서에 반영했다.
- Realtime Database 연결에 필요한 `databaseURL` 확인 항목을 `TODO.md`에 추가했다.
- Realtime Database URL을 로컬 `.env`에 추가하고 문서에 반영했다.
- 하단 네비게이션을 `홈 / 채팅 / 투표 / 메모 / 캘린더` 구조로 재정의했다.
- 화면 기획서 `SCREEN_SPEC.md`와 기능 정의서 `FEATURE_SPEC.md` 초안을 추가했다.
- 채팅 내 가족 초대, 비밀방, 투표 생성/전송 흐름과 메모/캘린더 세부 기능을 문서화했다.
