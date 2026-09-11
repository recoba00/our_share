# DEPLOYMENT

## Dothome 배포 원칙

Dothome에는 프로젝트 루트 전체를 그대로 업로드하지 않는다.

React + Vite 앱은 개발용 소스(`src`, `index.html`, `package.json`)를 서버가 직접 실행할 수 없다. 반드시 로컬에서 빌드한 뒤 생성되는 `dist` 폴더의 내용만 웹 경로에 업로드한다.

## 현재 배포 경로

- URL: `http://recoba00.dothome.co.kr/our_share/`
- 서버 업로드 대상: Dothome 웹 루트의 `our_share` 폴더

## 배포 절차

1. 로컬에서 빌드한다.

```bash
npm run build
```

2. 생성된 `dist` 폴더 안의 내용만 업로드한다.

```text
dist/index.html
dist/assets/*
dist/.htaccess
```

3. Dothome 서버에는 아래처럼 배치되어야 한다.

```text
our_share/
  index.html
  assets/
    index-*.js
    index-*.css
  .htaccess
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

브라우저에서 아래 주소를 열었을 때 HTML 안의 script 경로가 `/our_share/assets/index-*.js` 형태여야 한다.

```text
http://recoba00.dothome.co.kr/our_share/
```

만약 `/src/main.tsx`가 보이면 빌드 결과물이 아니라 개발용 루트 파일이 업로드된 상태다.

## Apache MIME 타입

Dothome Apache 환경에서 PWA manifest가 명확한 MIME 타입으로 내려오도록 `public/.htaccess`에 아래 타입을 명시한다.

```apache
AddType application/manifest+json .webmanifest
AddType image/svg+xml .svg
AddType text/css .css
AddType application/javascript .js
```

## GitHub Actions

`.github/workflows/deploy.yml`은 `master` 브랜치 push 시 아래 순서로 동작한다.

1. 저장소 checkout
2. Node.js 설치
3. `npm ci`
4. `npm run build`
5. `dist` 폴더 내용만 Dothome `html/our_share/`에 FTP 업로드

GitHub Repository Secrets에 아래 값을 등록해야 한다.

```text
FTP_PASSWORD
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

Firebase Web App 설정값은 클라이언트 공개 설정이므로 앱 코드에 기본 fallback을 둔다. GitHub Secrets를 등록하면 배포 시 해당 값이 우선 적용되고, 등록하지 않아도 현재 MVP Firebase 프로젝트로 빌드된다.

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
```

앱 라우터, 서비스 워커, PWA manifest는 Vite `base` 값을 기준으로 동작하도록 구성되어 있다.

실제 Firebase Hosting 이전 시에는 아직 아래 작업이 남아 있다.

- Firebase Hosting 배포 실행
- Firebase Auth 승인 도메인에 Firebase Hosting 도메인 추가
- GitHub Actions 배포 대상을 Dothome FTP에서 Firebase Hosting으로 교체
- Dothome workflow 비활성화 또는 제거

## PWA

`public/manifest.webmanifest`, `public/sw.js`, `public/pwa-icon.svg`는 Vite 빌드 시 `dist`에 복사된다.

서비스 워커와 오프라인 캐시는 HTTPS 또는 localhost에서만 동작한다. Dothome을 HTTP로 접속하는 동안에는 화면은 표시되지만 서비스 워커 등록과 PWA 설치 조건이 제한될 수 있다.
