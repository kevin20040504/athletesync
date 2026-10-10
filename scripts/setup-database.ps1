# Creates the AthleteSync databases and a dedicated MySQL user.
# Reads DB_DATABASE / DB_USERNAME / DB_PASSWORD from backend/.env and asks
# for the MySQL root password interactively, so no secret is stored in git.
#
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..\backend\.env'
if (-not (Test-Path $envFile)) { throw "backend/.env not found. Copy backend/.env.example to backend/.env first." }

$vars = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*(DB_[A-Z_]+)=(.*)$' } | ForEach-Object {
    $vars[$Matches[1]] = $Matches[2].Trim().Trim('"')
}
foreach ($key in 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD') {
    if (-not $vars[$key]) { throw "$key is empty in backend/.env" }
}

$mysql = (Get-Command mysql -ErrorAction SilentlyContinue).Source
if (-not $mysql) {
    $mysql = Get-ChildItem 'C:\mysql\*\bin\mysql.exe', 'C:\Program Files\MySQL\*\bin\mysql.exe' -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $mysql) { throw "mysql.exe not found. Add MySQL's bin folder to PATH." }

$db = $vars['DB_DATABASE']
$user = $vars['DB_USERNAME']
$pass = $vars['DB_PASSWORD'] -replace "'", "''"

# athletesync_testing is used by the automated test suite in Phase 3.
$sql = @"
CREATE DATABASE IF NOT EXISTS ``$db`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS ``${db}_testing`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$user'@'localhost' IDENTIFIED BY '$pass';
CREATE USER IF NOT EXISTS '$user'@'127.0.0.1' IDENTIFIED BY '$pass';
ALTER USER '$user'@'localhost' IDENTIFIED BY '$pass';
ALTER USER '$user'@'127.0.0.1' IDENTIFIED BY '$pass';
GRANT ALL PRIVILEGES ON ``$db``.* TO '$user'@'localhost', '$user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON ``${db}_testing``.* TO '$user'@'localhost', '$user'@'127.0.0.1';
FLUSH PRIVILEGES;
"@

Write-Host "Using $mysql"
Write-Host "Enter your MySQL root password when prompted."
& $mysql -u root -p -e $sql
if ($LASTEXITCODE -ne 0) { throw "MySQL setup failed (exit code $LASTEXITCODE)." }
Write-Host "Created databases '$db' and '${db}_testing' and user '$user'." -ForegroundColor Green
