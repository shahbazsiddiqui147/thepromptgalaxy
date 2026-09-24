# Pulls the latest server backup to this PC. Scheduled daily (and at logon) by Windows Task Scheduler.
# Skips files that were already downloaded, keeps the newest 30 of each kind, and fails loudly.
$ErrorActionPreference = 'Stop'

$server = 'root@46.250.239.74'
$key = Join-Path $env:USERPROFILE '.ssh\id_ed25519'
$dest = Join-Path $env:USERPROFILE 'galaxy-backups'
$remoteDir = '/var/backups/promptgalaxy'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$log = Join-Path $dest 'pull.log'

function Log($message) { Add-Content -Path $log -Value "$(Get-Date -Format s) $message" }

function Pull($latestName, $pattern) {
  $real = (& ssh -i $key -o BatchMode=yes -o ConnectTimeout=20 $server "readlink -f $remoteDir/$latestName 2>/dev/null").Trim()
  if (-not $real) { return $false }
  $name = Split-Path $real -Leaf
  $target = Join-Path $dest $name
  if (Test-Path $target) { Log "already have $name"; return $true }
  & scp -i $key -o BatchMode=yes -o ConnectTimeout=20 "${server}:$real" "$target.part"
  if ($LASTEXITCODE -ne 0) { throw "scp failed for $name" }
  if ((Get-Item "$target.part").Length -lt 1024) { Remove-Item "$target.part"; throw "$name is smaller than 1 KB" }
  Move-Item "$target.part" $target
  Log "downloaded $name ($((Get-Item $target).Length) bytes)"
  Get-ChildItem $dest -Filter $pattern | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item
  return $true
}

try {
  if (-not (Pull 'latest-db.dump' 'db-*.dump')) { throw 'no database backup found on the server' }
  Pull 'latest-uploads.tar.gz' 'uploads-*.tar.gz' | Out-Null
} catch {
  Log "ERROR: $_"
  throw
}
