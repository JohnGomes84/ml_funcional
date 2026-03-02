$ErrorActionPreference = "Stop"

function Parse-JsonOrNull([string]$raw) {
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  try { return ($raw | ConvertFrom-Json) } catch { return $null }
}

function Request-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers,
    $Body
  )

  $params = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
  }

  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
  }

  try {
    $resp = Invoke-WebRequest @params
    return [pscustomobject]@{
      Status = [int]$resp.StatusCode
      Raw = $resp.Content
      Json = Parse-JsonOrNull $resp.Content
    }
  } catch {
    $ex = $_.Exception
    if ($ex.Response) {
      $status = [int]$ex.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
      $raw = $reader.ReadToEnd()
      $reader.Close()
      return [pscustomobject]@{
        Status = $status
        Raw = $raw
        Json = Parse-JsonOrNull $raw
      }
    }
    throw
  }
}

$results = New-Object System.Collections.Generic.List[object]

function Check {
  param(
    [string]$Name,
    [int]$Expected,
    [int]$Actual,
    [string]$Detail = ""
  )

  $ok = ($Expected -eq $Actual)
  $results.Add([pscustomobject]@{ Name = $Name; Expected = $Expected; Actual = $Actual; Ok = $ok; Detail = $Detail }) | Out-Null
  if (-not $ok) {
    throw "FAIL: $Name (expected $Expected, got $Actual). $Detail"
  }
}

$port = 3015
$tmpDir = Join-Path $PWD "tmp"
if (-not (Test-Path $tmpDir)) { New-Item -ItemType Directory -Path $tmpDir | Out-Null }
$dbPath = Join-Path $tmpDir ("flow-test-" + [guid]::NewGuid().ToString() + ".db")

$env:PORT = "$port"
$env:DB_PATH = $dbPath
$env:JWT_SECRET = "test-secret-123456789"
$env:ALLOWED_EMAIL_DOMAIN = "mlservicoseco.com.br"

$server = $null

try {
  $server = Start-Process -FilePath node -ArgumentList "server-dist/server/core/index.js" -PassThru
  Start-Sleep -Seconds 2

  $health = Request-Api -Method GET -Url "http://localhost:$port/api/health"
  Check -Name "health" -Expected 200 -Actual $health.Status

  $badDomain = Request-Api -Method POST -Url "http://localhost:$port/api/auth/register" -Body @{ email = "x@gmail.com"; password = "12345678"; name = "Bad"; acceptTerms = $true }
  Check -Name "register invalid domain" -Expected 403 -Actual $badDomain.Status

  $weak = Request-Api -Method POST -Url "http://localhost:$port/api/auth/register" -Body @{ email = "weak@mlservicoseco.com.br"; password = "123"; name = "Weak"; acceptTerms = $true }
  Check -Name "register weak password" -Expected 400 -Actual $weak.Status

  $noTerms = Request-Api -Method POST -Url "http://localhost:$port/api/auth/register" -Body @{ email = "noterms@mlservicoseco.com.br"; password = "12345678"; name = "NoTerms"; acceptTerms = $false }
  Check -Name "register without terms" -Expected 400 -Actual $noTerms.Status

  $adminReg = Request-Api -Method POST -Url "http://localhost:$port/api/auth/register" -Body @{ email = "admin@mlservicoseco.com.br"; password = "Admin12345"; name = "Admin"; acceptTerms = $true }
  Check -Name "register admin first user" -Expected 201 -Actual $adminReg.Status

  $dupReg = Request-Api -Method POST -Url "http://localhost:$port/api/auth/register" -Body @{ email = "admin@mlservicoseco.com.br"; password = "Admin12345"; name = "Admin"; acceptTerms = $true }
  Check -Name "register duplicate" -Expected 400 -Actual $dupReg.Status

  $userReg = Request-Api -Method POST -Url "http://localhost:$port/api/auth/register" -Body @{ email = "user1@mlservicoseco.com.br"; password = "User12345"; name = "User One"; acceptTerms = $true }
  Check -Name "register user" -Expected 201 -Actual $userReg.Status

  $user2Reg = Request-Api -Method POST -Url "http://localhost:$port/api/auth/register" -Body @{ email = "user2@mlservicoseco.com.br"; password = "User12345"; name = "User Two"; acceptTerms = $true }
  Check -Name "register second user" -Expected 201 -Actual $user2Reg.Status

  $userToken = (Request-Api -Method POST -Url "http://localhost:$port/api/auth/login" -Body @{ email = "user2@mlservicoseco.com.br"; password = "User12345" }).Json.token
  $userHeaders = @{ Authorization = "Bearer $userToken" }

  $userForbidden = Request-Api -Method GET -Url "http://localhost:$port/api/auth/users" -Headers $userHeaders
  Check -Name "users endpoint forbidden for non-admin" -Expected 403 -Actual $userForbidden.Status

  for ($i = 1; $i -le 5; $i++) {
    $wrong = Request-Api -Method POST -Url "http://localhost:$port/api/auth/login" -Body @{ email = "user1@mlservicoseco.com.br"; password = "wrong-pass" }
    Check -Name ("login wrong password attempt " + $i) -Expected 401 -Actual $wrong.Status
  }

  $locked = Request-Api -Method POST -Url "http://localhost:$port/api/auth/login" -Body @{ email = "user1@mlservicoseco.com.br"; password = "User12345" }
  Check -Name "login locked account" -Expected 429 -Actual $locked.Status

  $adminLogin = Request-Api -Method POST -Url "http://localhost:$port/api/auth/login" -Body @{ email = "admin@mlservicoseco.com.br"; password = "Admin12345" }
  Check -Name "login admin" -Expected 200 -Actual $adminLogin.Status
  $adminToken = $adminLogin.Json.token
  $adminHeaders = @{ Authorization = "Bearer $adminToken" }

  $me = Request-Api -Method GET -Url "http://localhost:$port/api/auth/me" -Headers $adminHeaders
  Check -Name "me endpoint" -Expected 200 -Actual $me.Status

  $usersList = Request-Api -Method GET -Url "http://localhost:$port/api/auth/users" -Headers $adminHeaders
  Check -Name "users endpoint for admin" -Expected 200 -Actual $usersList.Status

  $demoteLastAdmin = Request-Api -Method PATCH -Url "http://localhost:$port/api/auth/users/1/role" -Headers $adminHeaders -Body @{ role = "user" }
  Check -Name "cannot demote last admin" -Expected 400 -Actual $demoteLastAdmin.Status

  $invalidRole = Request-Api -Method PATCH -Url "http://localhost:$port/api/auth/users/2/role" -Headers $adminHeaders -Body @{ role = "owner" }
  Check -Name "update role invalid" -Expected 400 -Actual $invalidRole.Status

  $promote = Request-Api -Method PATCH -Url "http://localhost:$port/api/auth/users/2/role" -Headers $adminHeaders -Body @{ role = "admin" }
  Check -Name "update role valid" -Expected 200 -Actual $promote.Status

  $audit = Request-Api -Method GET -Url "http://localhost:$port/api/auth/audit-logs?limit=20&offset=0" -Headers $adminHeaders
  Check -Name "audit logs admin" -Expected 200 -Actual $audit.Status

  Write-Output "ALL_FLOW_TESTS_PASSED"
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path $dbPath) {
    Remove-Item $dbPath -Force -ErrorAction SilentlyContinue
  }
}
