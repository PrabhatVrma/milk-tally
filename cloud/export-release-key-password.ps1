$ErrorActionPreference = 'Stop'
$passwordPath = Join-Path $env:LOCALAPPDATA 'MilkTally\release-signing\store-password.dpapi'
if (-not (Test-Path -LiteralPath $passwordPath)) { throw 'No protected signing password is available for this Windows user.' }
$confirm = Read-Host 'Type EXPORT to show the release-key password locally'
if ($confirm -cne 'EXPORT') { Write-Host 'Cancelled.'; exit 1 }
$securePassword = ConvertTo-SecureString (Get-Content -LiteralPath $passwordPath -Raw)
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    Write-Host 'Save this password in your own password manager. Do not paste it into Codex or commit it.'
    Write-Host $plainPassword
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $securePassword.Dispose()
}
