<#
.SYNOPSIS
    Automates Python virtual environment provisioning and dependency hydration.
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

Write-Output "SUCCESS: Python environment is stabilized and hydrated."