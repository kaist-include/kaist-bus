Param(
  [switch]$DataOnly
)

if ($DataOnly) {
  npm run update-data
  exit $LASTEXITCODE
}

npm run deploy
