# CODING_RULES

## 작업 시작 전 확인 파일

Codex는 작업 시작 전 반드시 아래 파일을 확인한다.

1. `PROJECT_CONTEXT.md`
2. `TODO.md`
3. `CHANGELOG.md`
4. `CODING_RULES.md`

## 작업 완료 후 업데이트

- 완료한 작업은 `TODO.md` 체크 상태를 업데이트한다.
- 작업 내용은 `CHANGELOG.md`에 날짜별로 작성한다.
- 기존 Architecture 변경 시 `PROJECT_CONTEXT.md`를 업데이트한다.
- 새 기능 추가 시 기존 구조를 깨지 말고 Feature 단위로 확장한다.
- 임의로 라이브러리를 추가하지 않는다.
- 라이브러리 추가가 필요한 경우 `package.json` 수정 이유를 `CHANGELOG.md`에 기록한다.
- 대규모 리팩터링을 한 번에 하지 않는다.
- 기능 단위로 커밋 가능한 수준으로 작업한다.
- Firebase Collection/Schema 이름은 임의 변경하지 않는다.

## 추천 폴더 구조

```text
src/
  app/
    router/
    providers/
  components/
    common/
    layout/
    navigation/
    modal/
    bottom-sheet/
  features/
    auth/
      components/
      hooks/
      services/
      types/
    family/
      components/
      services/
      store/
      types/
    location/
      components/
      hooks/
      services/
      types/
    calendar/
      components/
      services/
      types/
    memo/
      components/
      services/
      types/
    poll/
      components/
      services/
      types/
    chat/
      components/
      services/
      types/
  pages/
    home/
    map/
    calendar/
    memo/
    more/
  lib/
    firebase/
    utils/
    constants/
  hooks/
  stores/
  types/
  styles/
  assets/
```

## 공통 UI Components

필수 공통 컴포넌트:

- AppHeader
- BottomNavigation
- BottomSheet
- Modal
- ConfirmDialog
- Toast
- Snackbar
- Avatar
- AvatarGroup
- Button
- IconButton
- Card
- ListItem
- Badge
- Chip
- Tabs
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Calendar
- DatePicker
- TimePicker
- EmptyState
- Loading
- Skeleton

모든 페이지에서 중복 구현하지 않는다.

## Tailwind / 디자인 시스템

Font:

- Pretendard

Icons:

- Phosphor Icons

Radius:

- small: 8px
- medium: 12px
- large: 16px
- card: 20px

Spacing:

- Tailwind 기본 spacing 사용

Color는 CSS Variable / Tailwind Theme Token으로 관리한다.

예:

- `--color-primary`
- `--color-secondary`
- `--color-background`
- `--color-surface`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-border`
- `--color-success`
- `--color-warning`
- `--color-error`

컴포넌트마다 직접 hex 값을 반복 작성하지 않는다.
디자인 시스템을 우회하여 페이지에 독립적인 스타일을 만들지 않는다.

## TypeScript 규칙

- TypeScript `any` 사용을 최소화한다.
- API 응답, Firebase 문서, 컴포넌트 props에는 타입을 정의한다.
- UI와 비즈니스 로직을 분리한다.
- 페이지 컴포넌트는 조립과 화면 흐름에 집중한다.
- 도메인 타입은 각 feature의 `types` 폴더에 둔다.
- 여러 feature에서 공유되는 타입만 `src/types`에 둔다.

## Firebase 규칙

- 페이지 컴포넌트에 Firebase 로직을 직접 작성하지 않는다.
- Firebase 호출은 `features/*/services`로 분리한다.
- 모든 데이터 접근 시 `familyId` 확인을 전제로 설계한다.
- Firestore Security Rules를 우회하는 클라이언트 로직에 의존하지 않는다.
- Firebase API Key 등의 설정은 `.env`에서 관리한다.
- `.env`는 git에 커밋하지 않는다.
- Firebase 데이터 전체를 Zustand에 복제하지 않는다.
- 서버 데이터 캐싱과 동기화는 가능한 TanStack Query를 사용한다.

## 컴포넌트 작성 규칙

- 공통 UI는 `src/components`에 둔다.
- 기능 전용 UI는 `src/features/{feature}/components`에 둔다.
- 컴포넌트는 가능한 작게 유지하고 명확한 props를 가진다.
- 재사용 가능한 버튼, 입력, 모달, 바텀시트, 카드 등은 공통 컴포넌트를 사용한다.
- 모바일 UI를 우선한다.
- 기본 디자인 폭 360px, 최대 폭 768px 기준으로 확인한다.

## Git 규칙

- 기능 단위로 커밋 가능한 상태를 유지한다.
- `.env`, 빌드 결과물, 로컬 캐시, 로그 파일은 커밋하지 않는다.
- 원격 저장소 URL은 사용자 확인 후 연결한다.
- 배포 관련 설정 변경 시 `CHANGELOG.md`에 기록한다.

## Hosting 규칙

- 서버 호스팅 제공자와 배포 방식은 사용자 확인 후 확정한다.
- 배포 환경 변수는 로컬 `.env`와 분리해 호스팅 서비스의 환경 변수 관리 기능에 등록한다.
- 배포 URL이 확정되면 `PROJECT_CONTEXT.md` 또는 별도 배포 문서에 기록한다.
- 빌드 명령, 배포 명령, Firebase 설정 변경은 `CHANGELOG.md`에 기록한다.
- Dothome 접속 계정과 비밀번호는 문서, Git 설정, 소스코드에 저장하지 않는다.
- GitHub 접속 계정과 비밀번호 또는 토큰은 문서, Git 설정, 소스코드에 저장하지 않는다.
