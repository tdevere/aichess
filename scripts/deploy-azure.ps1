param (
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory=$true)]
    [string]$AppName
)

$ErrorActionPreference = "Stop"

# Use the fix for Azure CLI extentions if needed
$env:AZURE_EXTENSION_DIR = Join-Path $env:TEMP "AzureExtensions"
if (-not (Test-Path $env:AZURE_EXTENSION_DIR)) {
    New-Item -ItemType Directory -Force -Path $env:AZURE_EXTENSION_DIR | Out-Null
}

Write-Host "🚀 Starting Deployment for $AppName..." -ForegroundColor Cyan

# 1. Build Frontend
Write-Host "📦 Building Frontend..."
Push-Location frontend
try {
    npm install
    npm run build
} finally {
    Pop-Location
}

# 2. Build Backend
Write-Host "📦 Building Backend..."
Push-Location backend
try {
    npm install
    # Ensure dependencies are installed (including typescript) for build
    npm run build
} finally {
    Pop-Location
}

# 3. Prepare Deployment Artifact
Write-Host "📂 Staging files for deployment..."
$DeployDir = "deploy-temp"
if (Test-Path $DeployDir) { Remove-Item $DeployDir -Recurse -Force }
New-Item -ItemType Directory -Path $DeployDir | Out-Null

# Copy Config
Copy-Item -Path "backend/package.json" -Destination "$DeployDir/package.json"
Copy-Item -Path "backend/package-lock.json" -Destination "$DeployDir/package-lock.json"

# Copy backend node_modules to avoid build-on-deploy issues on Windows App Service
if (Test-Path "backend/node_modules") {
    Write-Host "  -> Copying backend node_modules..."
    Copy-Item -Path "backend/node_modules" -Destination "$DeployDir/node_modules" -Recurse
} else {
    Write-Warning "backend/node_modules not found. The app may fail to start without dependencies."
}

# Handle Distribution Folder
# We need to know where TS output the files.
if (Test-Path "backend/dist/server.js") {
    Write-Host "  -> Found standard dist structure."
    $ServerEntry = "dist\\server.js"
    $PublicRewritePath = "public"
    Copy-Item -Path "backend/dist" -Destination "$DeployDir" -Recurse
} elseif (Test-Path "backend/dist/backend/src/server.js") {
    Write-Host "  -> Found nested dist structure (monorepo behavior)."
    $ServerEntry = "dist\\backend\\src\\server.js"
    $PublicRewritePath = "dist\\backend\\public"
    # Create matching structure so relative requires work?
    # Or just copy the whole dist?
    # If we copy 'backend/dist/*' to 'deploy-temp/dist/', we preserve structure.
    # But start script is "node dist/server.js". 
    # If file is at "dist/backend/src/server.js", start script fails.
    
    # We will copy the whole dist content to deploy-temp/dist
    # And we will UPDATE package.json start script to match.
    New-Item -ItemType Directory -Path "$DeployDir/dist" | Out-Null
    Copy-Item -Path "backend/dist/*" -Destination "$DeployDir/dist" -Recurse
    
    # Patch package.json
    $Pkg = Get-Content "$DeployDir/package.json" | ConvertFrom-Json
    $Pkg.scripts.start = "node dist/backend/src/server.js"
    $Pkg | ConvertTo-Json -Depth 10 | Set-Content "$DeployDir/package.json"
    Write-Host "  -> Updated start script to: node dist/backend/src/server.js"
} else {
    Write-Error "Could not locate server.js in backend/dist. Build failed or unexpected structure."
    exit 1
}

# Copy Frontend Build to 'public' folder served by server.ts
# In server.ts we set static path to path.join(__dirname, '../public')
# If server.js is in 'dist/server.js', __dirname is '.../dist'. '../public' is '.../public'.
# If server.js is in 'dist/backend/src/server.js', __dirname is '.../dist/backend/src'. '../public' is '.../dist/backend/public'.
# This is tricky. 

# Let's standardize:
# We want the frontend files to be at a location relative to server.js called "../public".
# We will create 'public' folder inside the root of deployment (deploy-temp/public).
# And ensure server.js (wherever it is) looks for it.
# Actually, if server.js is deep, '../public' might essentially look for 'deploy-temp/dist/backend/public'.
# It is easier to put 'public' inside 'dist' relative to server.js?

# Simpler approach:
# If nested: server.js is at dist/backend/src/server.js.  ../public -> dist/backend/public.
# If standard: server.js is at dist/server.js.          ../public -> public.

if (Test-Path "backend/dist/backend/src/server.js") {
   $DestPublic = "$DeployDir/dist/backend/public"
    $DestWorker = "$DeployDir/dist/backend/stockfish-worker.js"
} else {
   $DestPublic = "$DeployDir/public"
    $DestWorker = "$DeployDir/dist/stockfish-worker.js"
}

Write-Host "  -> Copying frontend to $DestPublic"
New-Item -ItemType Directory -Path $DestPublic -Force | Out-Null
Copy-Item -Path "frontend/dist/*" -Destination $DestPublic -Recurse

# Ensure stockfish worker is included in deployment
if (Test-Path "backend/src/stockfish-worker.js") {
    Copy-Item -Path "backend/src/stockfish-worker.js" -Destination $DestWorker -Force
} else {
    Write-Warning "stockfish-worker.js not found; bot engine may fail."
}

# Create a root server.js and web.config for Windows App Service (iisnode)
$ServerShim = @"
require('./$ServerEntry');
"@
Set-Content -Path "$DeployDir/server.js" -Value $ServerShim

$WebConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
    <system.webServer>
        <handlers>
            <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
        </handlers>
        <iisnode loggingEnabled="true" logDirectory="iisnode" debuggingEnabled="true" />
        <rewrite>
            <rules>
                <rule name="NodeJS" patternSyntax="ECMAScript" stopProcessing="true">
                    <match url=".*" />
                    <action type="Rewrite" url="server.js" />
                </rule>
            </rules>
        </rewrite>
        <security>
            <requestFiltering>
                <hiddenSegments>
                    <add segment="node_modules" />
                    <add segment="iisnode" />
                </hiddenSegments>
            </requestFiltering>
        </security>
    </system.webServer>
</configuration>
"@
Set-Content -Path "$DeployDir/web.config" -Value $WebConfig


# 4. Zip
Write-Host "🗜️ Zipping deployment package..."
$ZipFile = "deploy.zip"
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$DeployDir/*" -DestinationPath $ZipFile -Force

# 5. Deploy
Write-Host "☁️  Deploying to Azure Web App '$AppName'..."
az webapp deployment source config-zip --resource-group $ResourceGroupName --name $AppName --src $ZipFile

Write-Host "`n✅ Deployment started! It may take a few minutes for the app to restart." -ForegroundColor Green
Write-Host "Monitor logs with: az webapp log tail --name $AppName --resource-group $ResourceGroupName"
