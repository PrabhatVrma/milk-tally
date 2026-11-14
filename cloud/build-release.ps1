$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$secretDir = Join-Path $env:LOCALAPPDATA 'MilkTally\release-signing'
$keyPath = Join-Path $secretDir 'milk-tally-release.jks'
$passwordPath = Join-Path $secretDir 'store-password.dpapi'
$keyAlias = 'milktally'

if (-not (Test-Path -LiteralPath $keyPath)) { throw "Release keystore missing: $keyPath" }
if (-not (Test-Path -LiteralPath $passwordPath)) { throw "Protected signing password missing: $passwordPath" }
if (-not $env:JAVA_HOME) {
    $bundledJdk = Join-Path $root 'work\temurin-jdk\jdk-17.0.21+9'
    if (Test-Path -LiteralPath $bundledJdk) { $env:JAVA_HOME = $bundledJdk }
}
if (-not $env:ANDROID_HOME) {
    $bundledSdk = Join-Path $root 'work\tools\android-sdk'
    if (Test-Path -LiteralPath $bundledSdk) { $env:ANDROID_HOME = $bundledSdk; $env:ANDROID_SDK_ROOT = $bundledSdk }
}
if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) { throw 'Set JAVA_HOME and ANDROID_HOME to JDK 17 and Android SDK 35.' }

$securePassword = ConvertTo-SecureString (Get-Content -LiteralPath $passwordPath -Raw)
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $env:MILK_TALLY_KEYSTORE = $keyPath
    $env:MILK_TALLY_STORE_PASSWORD = $plainPassword
    $env:MILK_TALLY_KEY_PASSWORD = $plainPassword
    $env:MILK_TALLY_KEY_ALIAS = $keyAlias
    & (Join-Path $PSScriptRoot 'sync-app.ps1')
    Push-Location (Join-Path $root 'android-app')
    try {
        & .\gradlew.bat clean assembleRelease
        if ($LASTEXITCODE -ne 0) { throw "Gradle release build failed with exit code $LASTEXITCODE" }
    } finally { Pop-Location }
    $apk = Join-Path $root 'android-app\app\build\outputs\apk\release\app-release.apk'
    $outDir = Join-Path $root 'outputs'
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    Copy-Item -LiteralPath $apk -Destination (Join-Path $outDir 'Milk-tally.apk') -Force
    Write-Host "Release APK created: $(Join-Path $outDir 'Milk-tally.apk')"
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $securePassword.Dispose()
    Remove-Item Env:MILK_TALLY_KEYSTORE,Env:MILK_TALLY_STORE_PASSWORD,Env:MILK_TALLY_KEY_PASSWORD,Env:MILK_TALLY_KEY_ALIAS -ErrorAction SilentlyContinue
}
