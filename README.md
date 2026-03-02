# kaist-bus-web

KAIST BUS 웹 버전입니다.
운영 중인 사이트는 [여기](http://bus.kaist.ac.kr)에서 확인하실 수 있습니다.

## 빌드 및 폴더 구조

- **`dist/`** — `npm run build` 결과물. **`dist/assets/`** 안에는 빌드 시 생성된 JS/CSS가 **짧은 해시 이름**(예: `571c249b.js`, `8d250c43.css`)으로 들어갑니다. `vite.config.js`의 `shortChunkName`·`shortenLongFilenames` 플러그인이 긴 청크 이름을 8자 해시로 줄입니다. **배포할 때는 이 `dist/` 폴더만 서빙하면 됩니다.**

- **`assets/`** (프로젝트 루트) — 예전 빌드에서 나온 긴 이름 파일(i18n-EtXYQdzn-....js 등)이 있을 수 있는 위치입니다. **소스 `index.html`/`route.html`에는 이제 긴 modulepreload 링크를 두지 않고**, 진입 스크립트(`/src/main.js`, `/src/route.js`)만 로드합니다. 개발 시에는 Vite가 청크를 자동으로 주고, 빌드 시에는 Vite가 `dist/index.html`/`dist/route.html`에 짧은 이름의 preload를 넣습니다. 루트 `assets/` 안의 긴 이름 파일은 더 이상 HTML에서 참조하지 않으므로, 정리해도 됩니다. 
