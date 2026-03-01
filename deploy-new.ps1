Param(
  [string]$CommitMessage,
  [switch]$Push
)

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
