import { createHash } from "crypto";

function pad2(value) {
  return String(value).padStart(2, "0");
}

const now = new Date();
const buildDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

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
