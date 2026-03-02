/**
 * ?????HTML?????????route.html / index.html)????????????
 * ?? HTML ???. ????????? ??? ???????????????.
 * ???: node scripts/legacy-redirects.js
 */
const fs = require("fs");
const path = require("path");

const REDIRECT_HTML = (targetUrl) => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=${targetUrl}">
<link rel="canonical" href="${targetUrl.startsWith("./") ? targetUrl.slice(1) : targetUrl}">
<title>??? ??- KAIST BUS 2.0</title>
<script>location.replace("${targetUrl.replace(/"/g, '&quot;')}");</script>
</head>
<body>
<p>??? ?????. <a href="${targetUrl}">????????</a>?????</p>
</body>
</html>
`;

// ??????????-> ??URL (???? ??)
const MAP = {
  "olev.html": "./route.html?route=olev",
  "wolpyeong.html": "./route.html?route=wolpyeong",
  "munji_weekends_outbound.html": "./route.html?route=campus-loop&day=weekend&from=munji&to=hwaam",
  "munji_weekends_inbound.html": "./route.html?route=campus-loop&day=weekend&from=munji&to=main",
  "munji_weekdays_outbound.html": "./route.html?route=campus-loop&day=weekday&from=munji&to=hwaam",
  "munji_weekdays_inbound.html": "./route.html?route=campus-loop&day=weekday&from=munji&to=main",
  "hwaam_weekdays.html": "./route.html?route=campus-loop&day=weekday&from=hwaam&to=main",
  "hwaam_weekends.html": "./route.html?route=campus-loop&day=weekend&from=hwaam&to=main",
  "hwaam_to_munji_weekdays.html": "./route.html?route=campus-loop&day=weekday&from=hwaam&to=munji",
  "hwaam_to_munji_weekends.html": "./route.html?route=campus-loop&day=weekend&from=hwaam&to=munji",
  "hwaam_to_munji_live.html": "./index.html",
  "main_weekdays.html": "./route.html?route=campus-loop&day=weekday&from=main",
  "main_weekends.html": "./route.html?route=campus-loop&day=weekend&from=main",
  "main_live.html": "./index.html",
  "hwaam_live.html": "./index.html",
  "munji_inbound_live.html": "./index.html",
  "munji_outbound_live.html": "./index.html",
  "seoul.html": "./index.html",
  "seoulEN.html": "./index.html",
  "commute_inbound.html": "./index.html",
  "commute_outbound.html": "./index.html",
  "about.html": "./index.html",
  "androidApp.html": "./index.html",
  "holidaySpecial.html": "./index.html",
  "carousel.html": "./index.html",
  "carousel_extra.html": "./index.html",
  "footer.html": "./index.html",
  "header.html": "./index.html"
};

const root = path.join(__dirname, "..");
const outDir = process.argv.includes("--out") ? path.join(root, process.argv[process.argv.indexOf("--out") + 1]) : root;
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
for (const [file, targetUrl] of Object.entries(MAP)) {
  const outPath = path.join(outDir, file);
  const html = REDIRECT_HTML(targetUrl);
  fs.writeFileSync(outPath, html, "utf8");
  console.log(file, "->", targetUrl);
}
if (outDir !== root) {
  const f404 = path.join(root, "404.html");
  if (fs.existsSync(f404)) {
    fs.copyFileSync(f404, path.join(outDir, "404.html"));
    console.log("404.html copied to " + outDir);
  }
  const fPrivacy = path.join(root, "privacypolicy.html");
  if (fs.existsSync(fPrivacy)) {
    fs.copyFileSync(fPrivacy, path.join(outDir, "privacypolicy.html"));
    console.log("privacypolicy.html copied to " + outDir);
  }
}
console.log("Done. " + Object.keys(MAP).length + " redirect files written to " + outDir);
