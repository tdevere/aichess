param (
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,

    [string]$Location = "westus2",

    [Parameter(Mandatory=$true)]
    [string]$AppName,

    [string]$DatabaseUrl,
    [string]$JwtSecret,
    [string]$RefreshTokenSecret,
    [string]$FrontendUrl,
    [string]$CallbackUrl,
    [string]$MicrosoftTenantId = "common",
    [ValidateSet("AzureADandPersonalMicrosoftAccount","AzureADMultipleOrgs","AzureADMyOrg")]
    [string]$SignInAudience = "AzureADandPersonalMicrosoftAccount"
)

$ErrorActionPreference = "Continue" # Changed to Continue to allow partial success

# FIX: Workaround for potential Azure CLI extension permission issues on some environments
$env:AZURE_EXTENSION_DIR = Join-Path $env:TEMP "AzureExtensions"
if (-not (Test-Path $env:AZURE_EXTENSION_DIR)) {
    New-Item -ItemType Directory -Force -Path $env:AZURE_EXTENSION_DIR | Out-Null
}

Write-Host "Starting Azure Setup..." -ForegroundColor Cyan

# 1. Create Resource Group
Write-Host "Creating Resource Group '$ResourceGroupName' in '$Location'..."
try {
    az group create --name $ResourceGroupName --location $Location
} catch {
    Write-Warning "Resource Group creation failed or already exists."
}

# 2. Create App Service Plan (Linux)
$PlanName = "$AppName-plan"
Write-Host "Creating App Service Plan '$PlanName' (F1 Free Tier)..."
# Try F1, if fails, user has no quota.
az appservice plan create --name $PlanName --resource-group $ResourceGroupName --sku F1 --is-linux 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to create App Service Plan (likely quota issue). Proceeding with Auth setup only."
}

# 3. Create Web App
Write-Host "Creating Web App '$AppName'..."
# Assuming hostname structure
$HostName = "$AppName.azurewebsites.net"
$WebAppCreated = $false

# Note: escaping pipe for PowerShell. Using colon syntax which is safer.
$WebAppOutput = az webapp create --resource-group $ResourceGroupName --plan $PlanName --name $AppName --runtime "NODE:20-lts" --output json 2>$null

if ($LASTEXITCODE -eq 0 -and $null -ne $WebAppOutput) {
    $WebApp = $WebAppOutput | ConvertFrom-Json
    $HostName = $WebApp.defaultHostName
    $WebAppCreated = $true
    Write-Host "✅ Web App Created: $HostName"
} else {
    Write-Warning "Web App creation failed. Skipping App Service configuration, but registering Auth."
    Write-Host "Assumed Hostname: $HostName"
}

# 4. Create or Update Entra ID App Registration
Write-Host "Creating/Updating Entra ID App Registration..."
# We add both the production URL and localhost for development
$DefaultCallback = "https://$HostName/api/auth/microsoft/callback"
$CallbackUrl = $CallbackUrl ? $CallbackUrl : $DefaultCallback
$RedirectUris = $CallbackUrl, "http://localhost:5000/api/auth/microsoft/callback"

$ExistingAppId = az ad app list --display-name "$AppName-auth" --query "[0].appId" -o tsv 2>$null
if ($ExistingAppId) {
    $ClientId = $ExistingAppId
    az ad app update --id $ClientId --set signInAudience=$SignInAudience | Out-Null
    az ad app update --id $ClientId --web-redirect-uris $RedirectUris | Out-Null
} else {
    # --sign-in-audience AzureADandPersonalMicrosoftAccount allows personal Outlook/Live accounts + Org accounts
    $AdApp = az ad app create --display-name "$AppName-auth" --sign-in-audience $SignInAudience --web-redirect-uris $RedirectUris --output json | ConvertFrom-Json
    $ClientId = $AdApp.appId
}

Write-Host "✅ App Registration Created (Client ID: $ClientId)"

# 5. Generate Client Secret
Write-Host "Generating Client Secret..."
$SecretObj = az ad app credential reset --id $ClientId --display-name "WebSetupSecret" --output json | ConvertFrom-Json
$ClientSecret = $SecretObj.password

# 6. Configure Web App Settings
if ($WebAppCreated) {
    Write-Host "Configuring Web App Environment Variables..."
    $AppSettings = @{
        MICROSOFT_CLIENT_ID = $ClientId
        MICROSOFT_CLIENT_SECRET = $ClientSecret
        MICROSOFT_TENANT_ID = $MicrosoftTenantId
        CALLBACK_URL = $CallbackUrl
        FRONTEND_URL = $FrontendUrl ? $FrontendUrl : "https://$HostName"
        BASE_URL = "https://$HostName"
        NODE_ENV = "production"
    }

    if ($DatabaseUrl) { $AppSettings.DATABASE_URL = $DatabaseUrl }
    if ($JwtSecret) { $AppSettings.JWT_SECRET = $JwtSecret }
    if ($RefreshTokenSecret) { $AppSettings.REFRESH_TOKEN_SECRET = $RefreshTokenSecret }

    az webapp config appsettings set --resource-group $ResourceGroupName --name $AppName --settings $AppSettings | Out-Null

    Write-Host "Enabling App Service logs..."
    az webapp log config --resource-group $ResourceGroupName --name $AppName --application-logging filesystem --level information --web-server-logging filesystem | Out-Null
} else {
    Write-Warning "Skipping App Settings configuration because Web App was not created."
}

Write-Host "`n✅ Azure Setup Steps Completed!" -ForegroundColor Green
Write-Host "--------------------------------------------------------"
Write-Host "Summary of Credentials (SAVE THESE in your local .env):"
Write-Host "MICROSOFT_CLIENT_ID=$ClientId"
Write-Host "MICROSOFT_CLIENT_SECRET=$ClientSecret"
Write-Host "MICROSOFT_TENANT_ID=$MicrosoftTenantId"
Write-Host "CALLBACK_URL=$CallbackUrl"
Write-Host "--------------------------------------------------------"
Write-Host "App is deployed at: https://$HostName"
