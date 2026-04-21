#Requires -Version 5.1
<#
.SYNOPSIS
    MCP-FFmpeg Server Installation Script

.DESCRIPTION
    Automated installation of mcp-ffmpeg MCP server including all prerequisites:
    - Node.js LTS
    - FFmpeg
    - Git
    - MCP Server setup
    - Claude Desktop configuration

.PARAMETER InstallPath
    Installation directory (default: C:\Program Files\mcp-servers\mcp-ffmpeg)

.PARAMETER SkipPrerequisites
    Skip installing Node.js, FFmpeg, and Git (use if already installed)

.PARAMETER SkipClaudeConfig
    Skip configuring Claude Desktop

.EXAMPLE
    .\install.ps1

.EXAMPLE
    .\install.ps1 -InstallPath "D:\MCP\mcp-ffmpeg"

.EXAMPLE
    .\install.ps1 -SkipPrerequisites

.NOTES
    Run as Administrator for best results (required for Program Files installation)
#>

param(
    [string]$InstallPath = "C:\Program Files\mcp-servers\mcp-ffmpeg",
    [switch]$SkipPrerequisites,
    [switch]$SkipClaudeConfig
)

# Configuration
$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/Schwarz-Mike/mcp-ffmpeg.git"
$RepoBranch = "claude/ffmpeg-mcp-server-RNUcW"

# Colors for output
function Write-Step { param($msg) Write-Host "`n[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }

# Banner
Write-Host @"

  __  __  ____ ____       _____ _____ __  __ ____  _____ ____
 |  \/  |/ ___|  _ \     |  ___|  ___|  \/  |  _ \| ____/ ___|
 | |\/| | |   | |_) |____| |_  | |_  | |\/| | |_) |  _|| |  _
 | |  | | |___|  __/_____|  _| |  _| | |  | |  __/| |__| |_| |
 |_|  |_|\____|_|        |_|   |_|   |_|  |_|_|   |_____\____|

  MCP Server Installation Script

"@ -ForegroundColor Magenta

# Check for Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin -and $InstallPath.StartsWith("C:\Program Files")) {
    Write-Warning "Not running as Administrator. Installation to Program Files may fail."
    Write-Warning "Consider running PowerShell as Administrator or use a different install path."
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Function to check if a command exists
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Function to refresh PATH in current session
function Update-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ============================================
# STEP 1: Install Prerequisites
# ============================================

if (-not $SkipPrerequisites) {

    # Check for WinGet
    if (-not (Test-Command "winget")) {
        Write-Error "WinGet is not available. Please install App Installer from Microsoft Store."
        Write-Host "https://apps.microsoft.com/store/detail/app-installer/9NBLGGH4NNS1"
        exit 1
    }

    # Install Node.js
    Write-Step "Checking Node.js..."
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-Success "Node.js already installed: $nodeVersion"
    } else {
        Write-Step "Installing Node.js LTS..."
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        Update-Path

        if (Test-Command "node") {
            $nodeVersion = node --version
            Write-Success "Node.js installed: $nodeVersion"
        } else {
            Write-Warning "Node.js installed but not in PATH. You may need to restart your terminal."
        }
    }

    # Install FFmpeg
    Write-Step "Checking FFmpeg..."
    if (Test-Command "ffmpeg") {
        $ffmpegVersion = (ffmpeg -version 2>&1 | Select-Object -First 1)
        Write-Success "FFmpeg already installed: $ffmpegVersion"
    } else {
        Write-Step "Installing FFmpeg..."
        winget install Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
        Update-Path

        if (Test-Command "ffmpeg") {
            Write-Success "FFmpeg installed successfully"
        } else {
            Write-Warning "FFmpeg installed but not in PATH. The MCP server will try to auto-detect it."
        }
    }

    # Install Git
    Write-Step "Checking Git..."
    if (Test-Command "git") {
        $gitVersion = git --version
        Write-Success "Git already installed: $gitVersion"
    } else {
        Write-Step "Installing Git..."
        winget install Git.Git --accept-package-agreements --accept-source-agreements
        Update-Path

        if (Test-Command "git") {
            Write-Success "Git installed successfully"
        } else {
            Write-Error "Git installation failed. Please install manually."
            exit 1
        }
    }
}

# ============================================
# STEP 2: Clone/Update Repository
# ============================================

Write-Step "Setting up MCP-FFmpeg server..."

# Create parent directory if needed
$parentDir = Split-Path $InstallPath -Parent
if (-not (Test-Path $parentDir)) {
    Write-Host "Creating directory: $parentDir"
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

# Clone or update repository
if (Test-Path "$InstallPath\.git") {
    Write-Host "Repository exists, pulling latest changes..."
    Push-Location $InstallPath
    git fetch origin
    git checkout $RepoBranch
    git pull origin $RepoBranch
    Pop-Location
} else {
    if (Test-Path $InstallPath) {
        Write-Warning "Directory exists but is not a git repository. Removing..."
        Remove-Item -Path $InstallPath -Recurse -Force
    }

    Write-Host "Cloning repository..."
    git clone -b $RepoBranch $RepoUrl $InstallPath
}

Write-Success "Repository ready at: $InstallPath"

# ============================================
# STEP 3: Install Dependencies and Build
# ============================================

Write-Step "Installing npm dependencies..."
Push-Location $InstallPath

# Check if npm is available
if (-not (Test-Command "npm")) {
    Write-Error "npm not found. Please ensure Node.js is installed correctly."
    Pop-Location
    exit 1
}

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed"
    Pop-Location
    exit 1
}
Write-Success "Dependencies installed"

Write-Step "Building project..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    Pop-Location
    exit 1
}
Write-Success "Build complete"

# Create output directory
$outputDir = Join-Path $InstallPath "output"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Success "Created output directory: $outputDir"
}

Pop-Location

# ============================================
# STEP 4: Configure Claude Desktop
# ============================================

if (-not $SkipClaudeConfig) {
    Write-Step "Configuring Claude Desktop..."

    $claudeConfigDir = "$env:APPDATA\Claude"
    $claudeConfigFile = "$claudeConfigDir\claude_desktop_config.json"

    # Create Claude config directory if needed
    if (-not (Test-Path $claudeConfigDir)) {
        New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
    }

    # Prepare the MCP server entry
    $serverPath = "$InstallPath\dist\index.js" -replace '\\', '\\'

    $mcpServerConfig = @{
        command = "node"
        args = @($serverPath)
    }

    # Load existing config or create new
    if (Test-Path $claudeConfigFile) {
        Write-Host "Found existing Claude config, updating..."
        $config = Get-Content $claudeConfigFile -Raw | ConvertFrom-Json -AsHashtable

        if (-not $config.ContainsKey("mcpServers")) {
            $config["mcpServers"] = @{}
        }
    } else {
        Write-Host "Creating new Claude config..."
        $config = @{
            mcpServers = @{}
        }
    }

    # Add/update mcp-ffmpeg server
    $config["mcpServers"]["mcp-ffmpeg"] = $mcpServerConfig

    # Save config
    $config | ConvertTo-Json -Depth 10 | Set-Content $claudeConfigFile -Encoding UTF8

    Write-Success "Claude Desktop configured"
    Write-Host "Config file: $claudeConfigFile"
}

# ============================================
# STEP 5: Summary
# ============================================

Write-Host "`n" + ("=" * 60) -ForegroundColor Green
Write-Host "  INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green

Write-Host @"

Installation Summary:
---------------------
  Install Path:    $InstallPath
  Output Folder:   $InstallPath\output
  Config File:     $env:APPDATA\Claude\claude_desktop_config.json

Next Steps:
-----------
  1. Restart Claude Desktop to load the MCP server
  2. Test by asking Claude: "Use ffmpeg_get_audio_info on a file"

Available Tools:
----------------
  - ffmpeg_get_audio_info      Get audio metadata
  - ffmpeg_convert_format      Convert audio formats
  - ffmpeg_adjust_volume       Adjust volume
  - ffmpeg_generate_silence    Create silent audio
  - ffmpeg_concat_audio        Join audio files
  - ffmpeg_compress_audio      Dynamic compression
  - ffmpeg_normalize_audio     EBU R128 normalization
  - ffmpeg_adjust_tempo        Change speed
  - ffmpeg_apply_fade          Fade effects
  - ffmpeg_mix_audio           Mix multiple tracks
  - ffmpeg_loop_audio          Loop to duration
  - ffmpeg_process_meditation_voice   Voice processing
  - ffmpeg_mix_meditation      Full meditation mix

"@ -ForegroundColor White

# Verify installation
Write-Step "Verifying installation..."
$indexPath = Join-Path $InstallPath "dist\index.js"
if (Test-Path $indexPath) {
    Write-Success "MCP server entry point found: $indexPath"
} else {
    Write-Error "Entry point not found! Build may have failed."
}

if (Test-Command "ffmpeg") {
    Write-Success "FFmpeg is available in PATH"
} else {
    Write-Warning "FFmpeg not in PATH - server will try to auto-detect"
}

Write-Host "`nInstallation complete! Please restart Claude Desktop." -ForegroundColor Cyan
