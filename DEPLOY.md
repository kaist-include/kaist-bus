# 배포 안내 (bus.kaist.ac.kr)

## 빌드 결과물

`npm run build` 후 `dist/` 폴더에는 다음이 포함됩니다.

- **진입점**: `index.html`, `route.html`, `privacypolicy.html`, `404.html`
- **레거시 리다이렉트용 HTML**: `olev.html`, `munji_weekdays_outbound.html`, `munji_weekends_inbound.html`, `main_live.html` 등 (MAP에 정의된 모든 파일)
- **에셋**: `assets/` 폴더

`/munji_weekdays_outbound.html` 같은 주소는 **실제 파일** `dist/munji_weekdays_outbound.html`을 보여줘야 하고, 그 페이지가 `route.html?route=...` 로 리다이렉트합니다.

## 라이브에서 레거시 URL이 메인으로 가는 경우

**원인**: 웹 서버가 “모든 경로를 `index.html`로 보내는” SPA 폴백만 쓰고 있을 때, 실제로 존재하는 `*.html` 파일 요청도 `index.html`로 처리될 수 있습니다.

**해결**: 서버 설정에서 **“먼저 해당 경로의 정적 파일을 찾고, 없을 때만 index.html”** 순서로 두어야 합니다.

### Nginx 예시

```nginx
root /path/to/dist;
index index.html;

# 먼저 요청한 파일이 있으면 그대로 서빙, 없을 때만 index.html (SPA 폴백)
try_files $uri $uri/ /index.html;
```

- `try_files $uri ...` 덕분에 `munji_weekdays_outbound.html` 요청 시 해당 파일이 그대로 서빙됩니다.
- `rewrite ^.* /index.html;` 처럼 **모든 요청을 무조건 index.html로 넘기는 규칙**이 있으면 제거하거나, 정적 파일 확장자(`.html` 등)는 제외하도록 수정해야 합니다.

### Apache 예시

```apache
DocumentRoot /path/to/dist
DirectoryIndex index.html

RewriteEngine On
# 실제 파일/디렉터리가 있으면 그대로 서빙
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### 배포 시 확인

- `dist/` **전체**를 서버에 업로드했는지 확인하세요. (레거시용 HTML들이 빠지면 해당 URL은 404 또는 서버 폴백으로 메인으로 갈 수 있습니다.)

요약: **dist에 파일이 있는데도 라이브에서 메인으로 간다면, 웹 서버의 “모든 경로 → index.html” 설정을 위처럼 “실제 파일 우선”으로 바꾸면 됩니다.**
