$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$secretDir = Join-Path $env:LOCALAPPDATA 'MilkTally\release-signing'
$keyPath = Join-Path $secretDir 'milk-tally-release.jks'
$passwordPath = Join-Path $secretDir 'store-password.dpapi'
$keyAlias = 'milktally'

if ((Test-Path -LiteralPath $keyPath) -or (Test-Path -LiteralPath $passwordPath)) {
    throw 'Release signing material already exists. Refusing to replace it.'
}
$jdkPath = Join-Path $root 'work\temurin-jdk\jdk-17.0.21+9'
if (-not (Test-Path -LiteralPath (Join-Path $jdkPath 'bin\keytool.exe'))) {
    if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to a JDK 17 installation first.' }
    $jdkPath = $env:JAVA_HOME
}
$keytool = Join-Path $jdkPath 'bin\keytool.exe'
if (-not (Test-Path -LiteralPath $keytool)) { throw "keytool was not found at $keytool" }

New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
$storeSecure = Read-Host 'Choose a strong release-key password (16+ characters); save it in your password manager' -AsSecureString
if ($storeSecure.Length -lt 16) { $storeSecure.Dispose(); throw 'Use a password with at least 16 characters.' }
$confirmSecure = Read-Host 'Enter the same release-key password again' -AsSecureString
$storeBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storeSecure)
$confirmBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmSecure)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($storeBstr)
    $confirmPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmBstr)
    if ($plainPassword -cne $confirmPassword) { throw 'The passwords did not match.' }
    $env:MILK_TALLY_STORE_PASSWORD = $plainPassword
    $env:MILK_TALLY_KEY_PASSWORD = $plainPassword
    & $keytool -genkeypair -alias $keyAlias -keyalg RSA -keysize 3072 -validity 10000 -keystore $keyPath -storetype JKS -storepass:env MILK_TALLY_STORE_PASSWORD -keypass:env MILK_TALLY_KEY_PASSWORD -dname 'CN=Milk tally, OU=Android Application' -noprompt
    if ($LASTEXITCODE -ne 0) { throw "keytool failed with exit code $LASTEXITCODE" }
    $protectedPassword = ConvertFrom-SecureString -SecureString $storeSecure
    [IO.File]::WriteAllText($passwordPath, $protectedPassword)
    Write-Host "Private release key saved to $keyPath"
    Write-Host "Password saved for this Windows user with DPAPI at $passwordPath"
    Write-Host 'The password was not displayed. Keep your password-manager copy and back up the keystore securely.'
} catch {
    Remove-Item -LiteralPath $keyPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $passwordPath -Force -ErrorAction SilentlyContinue
    throw
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($storeBstr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmBstr)
    $storeSecure.Dispose()
    $confirmSecure.Dispose()
    Remove-Item Env:MILK_TALLY_STORE_PASSWORD,Env:MILK_TALLY_KEY_PASSWORD -ErrorAction SilentlyContinue
    $plainPassword = $null
    $confirmPassword = $null
    $protectedPassword = $null
}
