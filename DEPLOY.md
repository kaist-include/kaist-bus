# 라이브 서버 배포 방법

운영 사이트: http://bus.kaist.ac.kr

## 1. 빌드

```bash
# 데이터 갱신 + 빌드 (권장)
npm run deploy

# 빌드만 (데이터는 그대로)
npm run build
```

결과물은 `dist/` 폴더에 생성됩니다.

## 2. 라이브 서버에 푸시

`dist/` 안의 **전체 내용**을 웹 서버의 문서 루트에 덮어쓰면 됩니다.

- **수동 업로드**: `dist/` 안의 모든 파일·폴더를 FTP/SFTP 또는 서버 관리 도구로 업로드합니다.
- **rsync** (Linux/macOS):
  ```bash
  rsync -av --delete dist/ 사용자@서버:/경로/문서루트/
  ```
- **scp**:
  ```bash
  scp -r dist/* 사용자@서버:/경로/문서루트/
  ```

주의: `dist/index.html`, `dist/route.html`과 `dist/assets/` 전체가 반드시 같은 문서 루트 아래에 있어야 합니다. (상대 경로 `/assets/...` 사용)

## 3. 캐시

배포 후 사용자가 예전 JS/CSS를 쓰는 경우 **강력 새로고침**(Ctrl+Shift+R) 또는 브라우저 캐시 삭제가 필요할 수 있습니다.
