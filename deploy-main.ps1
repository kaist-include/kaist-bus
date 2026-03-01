Param(
  [string]$CommitMessage,
  [switch]$Push,
  [switch]$NoData
)

# 기존 dist 빌드 산출물 정리 (해시된 파일 누적 방지)
if (Test-Path "dist") {
  Remove-Item "dist" -Recurse -Force
}

if ($NoData) {
  npm run build
} else {
  npm run deploy
}

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

# GitHub Pages 루트의 기존 /assets 정리 (해시된 번들 파일 누적 방지)
if (Test-Path "assets") {
  Remove-Item "assets" -Recurse -Force
}

Copy-Item -Path "dist\*" -Destination "." -Recurse -Force

git add -A

if ($CommitMessage) {
  git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  if ($Push) {
    git push origin master
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
}

git status -sb
