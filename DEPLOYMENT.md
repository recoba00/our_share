# DEPLOYMENT

## Firebase Hosting 배포 원칙

기본 배포 대상은 Firebase Hosting이다.

React + Vite 앱은 개발용 소스(`src`, `index.html`, `package.json`)를 호스팅에 그대로 배포하지 않는다. 반드시 빌드 후 생성되는 `dist` 폴더를 Firebase Hosting에 배포한다.

## 현재 배포 경로

- Primary URL: `https://our-share-6baf5.web.app`
- Alternate URL: `https://our-share-6baf5.firebaseapp.com`
- Legacy Dothome URL: `http://recoba00.dothome.co.kr/our_share/`

## 배포 절차

1. 로컬에서 빌드한다.

```bash
npm run build:firebase
npm run test:dist:firebase
```

2. Firebase Hosting에 배포한다.

```bash
npx -y firebase-tools@latest deploy --only hosting --project our-share-6baf5
```

3. 배포 후 확인한다.

```bash
npm run test:hosting
```

## 잘못된 배포

아래 파일/폴더를 서버 웹 경로에 그대로 올리면 화면이 보이지 않는다.

```text
src/
node_modules/
package.json
vite.config.ts
tailwind.config.ts
루트 index.html
```

루트 `index.html`은 개발 서버용 파일이며, 브라우저에서 직접 실행되는 배포 파일이 아니다.

## 확인 방법

브라우저에서 아래 주소를 열었을 때 HTML 안의 script 경로가 `/assets/index-*.js` 형태여야 한다.

```text
https://our-share-6baf5.web.app/
```

만약 `/src/main.tsx`가 보이면 빌드 결과물이 아니라 개발용 루트 파일이 업로드된 상태다.

## GitHub Actions

`.github/workflows/deploy.yml`은 `master` 브랜치 push 시 아래 순서로 동작한다.

1. 저장소 checkout
2. Node.js 설치
3. `npm ci`
4. `npm run lint`
5. `npm run test:ui-feedback`
6. `npm run test:rules`
7. `npm run build:firebase`
8. `npm run test:dist:firebase`
9. Firebase Hosting live 채널 배포
10. `npm run test:hosting`

GitHub Repository Secrets에 Firebase 배포용 서비스 계정 JSON을 등록해야 한다.

```text
FIREBASE_SERVICE_ACCOUNT_OUR_SHARE_6BAF5
```

이 값은 Firebase 계정 비밀번호가 아니라 Google Cloud 서비스 계정 키 파일의 JSON 전체 내용이다.

필수 포함 필드:

```text
project_id: our-share-6baf5
client_email
private_key
```

GitHub Actions는 배포 전에 이 Secret이 올바른 JSON 형태인지 먼저 검사한다. 값이 비밀번호이거나 일부만 복사된 경우 Firebase Hosting 배포 단계 전에 실패하며, Firebase Hosting URL은 이전 배포 상태 또는 404 상태로 남을 수 있다.

현재 화면에 남아 있는 `FTP_PASSWORD`는 Dothome FTP 배포용 Secret이므로 Firebase Hosting 전환 후에는 사용하지 않는다. 필요 없으면 삭제해도 된다.

Firebase Web App 설정값은 클라이언트 공개 설정이므로 앱 코드에 기본 fallback을 둔다. GitHub Secrets를 등록하면 배포 시 해당 값이 우선 적용되고, 등록하지 않아도 현재 MVP Firebase 프로젝트로 빌드된다.

GitHub Repository Secrets에 Firebase 설정값을 선택적으로 등록할 수 있다.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## Legacy Dothome

Dothome을 다시 써야 할 경우에만 아래 명령을 사용한다.

```bash
npm run build
npm run test:dist
```

생성된 `dist` 폴더 안의 내용만 Dothome `html/our_share/`에 업로드한다.

Dothome Apache 환경에서 PWA manifest가 명확한 MIME 타입으로 내려오도록 `public/.htaccess`에 아래 타입을 명시한다.

```apache
AddType application/manifest+json .webmanifest
AddType image/svg+xml .svg
AddType text/css .css
AddType application/javascript .js
```

Legacy Dothome FTP 배포를 다시 활성화하려면 아래 Secret이 필요하다.

```text
FTP_PASSWORD
```

## SPA 라우팅

`/our_share/calendar`, `/our_share/chat` 같은 경로 새로고침을 위해 `.htaccess`를 `dist`에 포함한다.

`public/.htaccess`는 Vite 빌드 시 자동으로 `dist/.htaccess`로 복사된다.

## Firebase Hosting 이전 준비

Firebase Hosting 설정은 `firebase.json`에 미리 추가되어 있다.

```json
"hosting": {
  "public": "dist",
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

Dothome 배포는 `/our_share/` 하위 경로를 사용하므로 기본 빌드는 아래 명령을 사용한다.

```bash
npm run build
```

Firebase Hosting은 루트 경로 배포를 기준으로 아래 명령을 사용한다.

```bash
npm run build:firebase
npm run test:dist:firebase
```

앱 라우터, 서비스 워커, PWA manifest는 Vite `base` 값을 기준으로 동작하도록 구성되어 있다.

`npm run test:dist`와 `npm run test:dist:firebase`는 `dist/index.html`의 asset 경로, PWA 파일, manifest/service worker의 하드코딩 경로를 검사한다.

MVP 최종 점검은 아래 명령으로 한 번에 실행할 수 있다.

```bash
npm run test:mvp
```

이 명령은 lint, UI feedback smoke 테스트, Firebase Rules 테스트, Dothome 빌드/산출물 검증, Firebase Hosting 빌드/산출물 검증을 순서대로 실행한다.

Firebase Hosting 이전은 완료된 상태다.

현재 운영 배포는 GitHub Actions가 `master` 브랜치 push를 기준으로 Firebase Hosting live 채널에 자동 배포한다.

릴리즈 후보 점검은 배포 전 로컬에서 `npm run test:mvp`를 실행하고, 배포 후 GitHub Actions의 `npm run test:hosting` 단계 성공 여부로 확인한다.

## PWA

`public/manifest.webmanifest`, `public/sw.js`, `public/pwa-icon.svg`는 Vite 빌드 시 `dist`에 복사된다.

서비스 워커와 오프라인 캐시는 HTTPS 또는 localhost에서만 동작한다. Dothome을 HTTP로 접속하는 동안에는 화면은 표시되지만 서비스 워커 등록과 PWA 설치 조건이 제한될 수 있다.
