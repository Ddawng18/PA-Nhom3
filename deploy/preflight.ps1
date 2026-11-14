param(
    [string]$ApiBase = "http://localhost:4174"
)

$ErrorActionPreference = "Stop"
$uri = "$($ApiBase.TrimEnd('/'))/api/health/preflight"

try {
    $result = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 30
} catch {
    Write-Error "Không gọi được preflight tại $uri. Kiểm tra backend đang chạy. $($_.Exception.Message)"
    exit 1
}

Write-Output "status=$($result.status) environment=$($result.environment)"
Write-Output "missingConfigNames=$($result.missingConfigNames -join ',')"
Write-Output "database.mode=$($result.database.mode) connected=$($result.database.connected) errorKind=$($result.database.errorKind) schemaReady=$($result.database.schema.ready)"
if ($result.database.hint) {
    Write-Output "database.hint=$($result.database.hint)"
}
Write-Output "storage.configured=$($result.storage.configured) storage.available=$($result.storage.available) bucket=$($result.storage.bucket)"
Write-Output "payment.mode=$($result.payment.mode)"

if ($result.status -ne "ok") {
    Write-Output "PREFLIGHT=FAIL"
    exit 1
}

if (-not $result.storage.available) {
    Write-Output "PREFLIGHT=FAIL_STORAGE (điền SUPABASE_SERVICE_ROLE_KEY và kiểm tra bucket)"
    exit 1
}

Write-Output "PREFLIGHT=PASS"
