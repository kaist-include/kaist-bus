Param(
  [string]$CommitMessage,
  [switch]$Push
)

# /new 디렉터리의 이전 빌드 산출물 정리 (해시된 파일 누적 방지)
if (Test-Path "new") {
  Remove-Item "new" -Recurse -Force
}

npm run deploy:new
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

git add new package.json package-lock.json

if ($CommitMessage) {
  git commit -m $CommitMessage
  if ($Push) {
    git push
  }
}

git status -sb
