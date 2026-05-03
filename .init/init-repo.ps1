<#
.SYNOPSIS
    Bootstraps local repository configurations and binds version-controlled Git hooks.
    Engineered for strict idempotency and MSYS2 environment stabilization.
#>
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$TargetHooksDirectory = ".githooks"

function Invoke-GitConfigurationBind {
    # Guard clause: Prevent execution if the native Git toolchain is missing
    if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
        Write-Error "CRITICAL_FAILURE: Git executable not detected in environment PATH."
        exit 1
    }

    # Bind execution context to physical file location to prevent CWD drift
    if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
        Write-Error "CRITICAL_FAILURE: Execution context unbound."
        exit 1
    }

    $RepoRoot = git -C $PSScriptRoot rev-parse --show-toplevel 2>$null
    
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($RepoRoot)) {
        Write-Error "CRITICAL_FAILURE: Unable to resolve Git repository root origin."
        exit 1
    }

    Set-Location -Path $RepoRoot

    # Idempotent directory creation: Ensures hook target boundary exists
    if (-not (Test-Path -Path $TargetHooksDirectory -PathType Container)) {
        Write-Output "PROVISIONING: Initializing $TargetHooksDirectory directory boundary..."
        New-Item -ItemType Directory -Path $TargetHooksDirectory | Out-Null
    }

    # Construct absolute path and enforce forward slashes. 
    # WHY: MSYS2 environments fail to resolve Windows backslashes during git-commit lifecycle hooks.
    $AbsoluteHookPath = Join-Path -Path $RepoRoot -ChildPath $TargetHooksDirectory
    $NormalizedHookPath = $AbsoluteHookPath -replace '\\', '/'

    # Re-route Git hook execution to the version-controlled path. Idempotent overwrite.
    Write-Output "BINDING: Re-routing execution vector core.hooksPath to $NormalizedHookPath..."
    git config core.hooksPath $NormalizedHookPath

    if ($LASTEXITCODE -ne 0) {
        Write-Error "CRITICAL_FAILURE: Git configuration mutation failed."
        exit 1
    }

    # Failsafe: Re-assert Git index execution bits to override aggressive NTFS permission stripping.
    # WHY: Windows graphical Git clients frequently discard POSIX +x bits upon checkout.
    Write-Output "PERMISSION_ENFORCEMENT: Verifying index execution constraints..."
    git update-index --chmod=+x "$NormalizedHookPath/pre-commit" 2>$null

    Write-Output "SUCCESS: Repository initialization sequence complete."
}

Invoke-GitConfigurationBind