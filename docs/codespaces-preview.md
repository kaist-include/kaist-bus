# 개인 PC 없이 UI 미리보기

## 시작하기

1. [GitHub 청구 설정](https://github.com/settings/billing)에 로그인해 Codespaces의 현재 사용량, 결제 주체, 예산/사용 중단 설정을 확인한다. 이 저장소의 설정만으로 계정 잔여량이나 조직 정책을 확인할 수는 없다.
2. [개발 브랜치](https://github.com/kaist-include/kaist-bus/tree/dev/codespaces-mobile-preview)에서 **Code → Codespaces → Create codespace**를 선택한다. 옵션에서 브랜치를 확인하고 가장 작은 **2-core** 머신을 선택한다. master 병합 없이도 이 브랜치에서 시작할 수 있다.
3. 컨테이너 생성과 `npm ci`가 끝나면 브라우저 터미널에서 실행한다.

   ```sh
   node --version # v24.x
   npm run dev
   ```

4. **PORTS → 5173 → Open in Browser**를 누른다. 포트 공개 범위는 **Private**로 유지한다. 같은 GitHub 계정으로 로그인한 휴대전화와 PC에서 PORTS의 복사 버튼으로 얻은 URL을 열면 된다.
   주소 형태는 `https://<codespace-name>-5173.app.github.dev`이다. `localhost:5173`을 휴대전화에 입력하는 것이 아니다.
5. 브라우저 편집기에서 UI를 저장하면 Vite가 화면을 갱신한다. 다른 환경에서 수정한 코드는 해당 개발 브랜치에 커밋/푸시한 뒤 Codespace에서 가져와야 한다. 이 환경은 다른 Codex 작업 공간과 자동 동기화되지 않는다.

개인 PC는 꺼져 있어도 된다. 다만 Codespace와 `npm run dev` 프로세스가 실행 중이어야 한다. 중지된 환경은 [Codespaces 목록](https://github.com/codespaces)에서 다시 열고 `npm run dev`를 다시 실행한다. 이 구성은 상시 공개 호스팅이 아니다. 브라우저 편집기 탭을 닫아도 즉시 중지되는 것은 아니다.

## 비용과 사용 가능 조건 (2026-10-08 확인)

| 개인 계정 | 포함 컴퓨팅 사용량 | 2코어로 환산한 실행 시간 | 포함 저장량 |
| --- | --- | --- | --- |
| GitHub Free | 월 120 core-hours | 약 60시간 | 15 GB-month |
| GitHub Pro | 월 180 core-hours | 약 90시간 | 20 GB-month |

초과 사용 시 2코어는 $0.18/시간, 저장 공간은 $0.07/GB-month이다. 다른 Codespace 사용량과 합산된다. 조직 결제에는 개인 무료 할당량이 그대로 적용되지 않는다. 결제 수단이 없으면 무료 할당량 소진 후 생성/재개가 차단된다. 결제 수단이 있으면 계정의 예산과 사용 중단 설정을 확인한다.

- 작업 후 Codespaces 목록에서 **Stop codespace**. 중지해도 저장 공간 사용량은 남는다.
- [Codespaces 설정](https://github.com/settings/codespaces)에서 유휴 종료를 15~30분으로 설정하고, 필요 없는 환경은 커밋/푸시 후 삭제한다. 포트 트래픽도 유휴 판정에 영향을 주므로 명시적 Stop이 확실하다.
- 기본 `universal` 이미지에 Node 24 Feature를 추가했다. GitHub 문서상 기본 이미지 기반 컨테이너는 Feature를 추가해도 컨테이너 이미지 자체가 저장량에 포함되지 않는다. 저장소/설치한 의존성 등은 포함된다.
- 생성 화면에 정책/예산/권한 오류가 표시되면 해당 오류를 확인한다. 현재 연결 도구로는 계정의 생성 자격, 실제 잔여량, 조직 제한을 검증하지 못했다.

## 운영과 분리

- 개발 브랜치에서 작업한다. master에 푸시하면 기존 운영 배포가 실행된다.
- `.github/workflows/deploy.yml`, `gh-pages`, 도메인/CNAME, 시간표 데이터는 이 구성에서 변경하지 않는다.
- **Actions의 기존 Deploy to GitHub Pages를 개발 브랜치에서 수동 실행하지 않는다.** `workflow_dispatch`도 운영 gh-pages를 갱신할 수 있다.
- `npm run dev`의 기존 predev는 레거시 HTML 리다이렉트를 생성하며 시간표 수집은 하지 않는다. 커밋 전에 `git status`로 의도한 파일만 확인한다.
- `npm run build` / `npm run deploy`는 기존 prebuild에서 시간표 수집을 실행한다. UI만 검증할 때는 아래처럼 직접 Vite를 실행한다.

  ```sh
  npm test
  ./node_modules/.bin/vite build
  git diff --exit-code -- src/data .github/workflows/deploy.yml
  ```

## 구성과 점검

- `.devcontainer/devcontainer.json`: Node 24 설치, `npm ci`, 5173 포트 자동 전달. Vite의 내부 HTTP를 GitHub가 외부 HTTPS로 전달하므로 PORTS의 내부 프로토콜은 HTTP로 둔다.
- `vite.config.js`: Codespaces 환경에서만 해당 환경의 정확한 호스트를 허용하고 WebSocket 클라이언트를 WSS/443으로 연결한다. 5173이 사용 중이면 다른 포트로 조용히 이동하지 않고 실패한다. 일반 로컬 개발 및 빌드 설정은 유지한다.
- 컨테이너 설정을 바꾼 기존 Codespace는 **Codespaces: Rebuild Container**로 적용한다.

실제 환경에서 아래 항목을 확인한다.

1. `node --version`이 v24.x인지 확인하고 `npm run dev`를 실행한다.
2. PORTS에서 5173과 Private을 확인한다. PC와 휴대전화에서 동일한 전달 URL로 홈과 `/route.html?route=wolpyeong`을 연다.
3. 임시 CSS 수정/저장을 하여 두 기기에 반영되는지 확인한 다음 되돌린다. 모바일 세로/가로, 스크롤, 노선 선택, 언어 전환을 확인한다.
4. 403이면 같은 GitHub 계정으로 로그인했는지 확인한다. Vite의 blocked host 오류이면 Codespaces 환경 변수와 PORTS URL이 일치하는지 확인하고 서버를 재시작한다. 전체 도메인 허용(`allowedHosts: true`)으로 우회하지 않는다.
5. Codespace를 중지해 미리보기가 멈추는지 확인하고, 다시 열어 서버를 시작한 뒤 접속을 확인한다.

이 변경의 로컬 검증과 실제 Codespaces 컨테이너 생성/인증/휴대전화 접속 검증은 별개다. 후자는 실제 계정에서 첫 실행 때 수행해야 한다.

## Codespaces를 쓸 수 없을 때

| 방안 | 장점 | 제약 / 판단 |
| --- | --- | --- |
| 현재 저장소의 Pages에 개발 경로 추가 | 새 저장소 불필요 | 운영과 같은 배포 대상. 현재 force_orphan 전체 배포와 충돌하므로 선택하지 않음 |
| 별도 `kaist-bus-preview` 저장소 + GitHub Pages | 별도 서비스 가입 없이 고정 URL, 개발 머신이 꺼져도 접근 | 커밋/Actions 빌드 후 반영, 실시간 HMR 없음. 가장 단순한 GitHub 내 대안으로 선택 |

계정 제한이 실제로 확인되면 별도 미리보기 저장소를 생성하고 Pages/Actions를 그 저장소에만 구성한다. 개발 소스를 해당 저장소의 개발 브랜치에 푸시하고 `npm ci` 및 `./node_modules/.bin/vite build --base=/kaist-bus-preview/`로 빌드한 `dist`만 배포한다. 시간표 스크레이퍼를 실행하지 않으며 운영 `CNAME`은 결과물에서 제외한다. 경로를 가정하는 링크/자산은 프로젝트 하위 경로에서 검증해야 한다. GitHub Pages의 저장소 공개 범위별 플랜 조건과 Actions 사용량도 생성 시 확인한다.

현재는 Codespaces가 기술적으로 적합하므로 별도 저장소/배포는 만들지 않았다. 이 대안은 Codespaces 할당량을 사용하지 않지만 항상 켜진 클라우드 편집기를 제공하지는 않는다.

## 공식 자료

- [Codespaces 과금과 무료 할당량](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)
- [포트 전달과 공유](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
- [유휴 종료](https://docs.github.com/en/codespaces/setting-your-user-preferences/setting-your-timeout-period-for-github-codespaces)
- [기본 환경 변수](https://docs.github.com/en/codespaces/developing-in-a-codespace/default-environment-variables-for-your-codespace)
- [Vite 서버 설정](https://vite.dev/config/server-options)
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
