<#
.SYNOPSIS
    Automates Python virtual environment provisioning, dependency hydration, and
    AWS CLI deployment environment verification.
    Anchors execution to the Git repository root to prevent path desynchronization.
#>
$ErrorActionPreference = "Stop"

# Resolve absolute Git root to prevent misplaced .venv directories
$RepoRoot = git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) {
    Write-Error "CRITICAL_FAILURE: Unable to resolve Git repository root."
    exit 1
}

Set-Location -Path $RepoRoot

if (Test-Path -Path ".venv") {
    Write-Output "CLEANUP: Removing existing .venv boundary..."
    Remove-Item -Recurse -Force ".venv"
}

Write-Output "PROVISIONING: Creating Python virtual environment at $RepoRoot\.venv"
python -m venv .venv

Write-Output "HYDRATION: Installing dependencies from requirements.txt..."
# Use direct pathing to the new venv's python executable
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt

# Verify AWS CLI installation for S3 deployment scripts
Write-Output "VERIFICATION: Checking for system-level AWS CLI installation..."
$AwsCli = Get-Command aws -ErrorAction SilentlyContinue
if (-not $AwsCli) {
    Write-Warning "AWS CLI is not detected on your system PATH."
    Write-Warning "This repository's S3 upload scripts require the AWS CLI to be installed at the system level."
    Write-Warning "How to install AWS CLI v2:"
    Write-Warning "  - Via winget: winget install Amazon.AWSCLI"
    Write-Warning "  - Download installer: https://aws.amazon.com/cli/"
} else {
    try {
        $AwsVersion = & aws --version 2>&1
        Write-Output "AWS CLI detected: $AwsVersion"
    } catch {
        Write-Warning "AWS CLI is on your PATH but failed to execute."
    }
}

Write-Output "SUCCESS: Python environment and S3 deployment tools are stabilized."
