Param(
  [string]$CommitMessage,
  [switch]$Push,
  [switch]$NoData
)

if ($NoData) {
  npm run build
} else {
  npm run deploy
}

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
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
