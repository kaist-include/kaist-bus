import { createHash } from "crypto";

function pad2(value) {
  return String(value).padStart(2, "0");
}

// 빌드 머신(예: GitHub Actions 러너는 UTC)과 무관하게 한국시간(KST, GMT+9) 벽시계로 고정한다.
// UTC 인스턴트에 +9시간을 더한 뒤 getUTC*로 읽으면 타임존 설정에 의존하지 않는다. KST는 서머타임이 없어 항상 +9.
const now = new Date();
const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
const buildDate = `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())} ${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}`;

function shortChunkName(chunkInfo) {
  const h = createHash("sha256").update(chunkInfo.name || "chunk").digest("hex").slice(0, 8);
  return `assets/${h}.js`;
}

function shortenLongFilenames() {
  const renames = new Map();
  const short = (longName) => {
    if (renames.has(longName)) return renames.get(longName);
    const base = longName.replace(/^assets\//, "").replace(/\.[^.]+$/, "");
    const ext = longName.includes(".css") ? ".css" : longName.match(/\.[^.]+$/)?.[0] || ".js";
    const h = createHash("sha256").update(base).digest("hex").slice(0, 8);
    const shortName = `assets/${h}${ext}`;
    renames.set(longName, shortName);
    return shortName;
  };
  return {
    name: "shorten-long-filenames",
    generateBundle(_, bundle) {
      const entries = Object.entries(bundle);
      for (const [fileName, output] of entries) {
        if (fileName.length < 25) continue;
        const newName = short(fileName);
        if (newName === fileName) continue;
        output.fileName = newName;
        bundle[newName] = output;
        delete bundle[fileName];
        for (const item of Object.values(bundle)) {
          if (item.type === "chunk" && item.code) {
            item.code = item.code.split(fileName).join(newName);
          }
          if (item.type === "asset" && typeof item.source === "string") {
            item.source = item.source.split(fileName).join(newName);
          }
        }
      }
    }
  };
}

export default {
  root: 'src',
  publicDir: '../public',
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate)
  },
  server: {
    host: true,
    port: 5173
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'src/index.html',
        route: 'src/route.html'
      },
      output: {
        chunkFileNames: shortChunkName,
        entryFileNames: 'assets/[name]-[hash:8].js',
        assetFileNames: 'assets/[name]-[hash:8][extname]'
      },
      plugins: [shortenLongFilenames()]
    }
  }
}
