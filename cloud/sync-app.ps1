$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Copy-Item (Join-Path $root 'index.html') (Join-Path $root 'public\index.html') -Force
Copy-Item (Join-Path $root 'cloud-client.js') (Join-Path $root 'public\cloud-client.js') -Force
Copy-Item (Join-Path $root 'admin.html') (Join-Path $root 'public\admin.html') -Force
Copy-Item (Join-Path $root 'admin-client.js') (Join-Path $root 'public\admin-client.js') -Force
Copy-Item (Join-Path $root 'firebase-config.js') (Join-Path $root 'public\firebase-config.js') -Force
Copy-Item (Join-Path $root 'assets\*') (Join-Path $root 'public\assets') -Force
$androidAssets = Join-Path $root 'android-app\app\src\main\assets\www'
Copy-Item (Join-Path $root 'public\*') $androidAssets -Recurse -Force
