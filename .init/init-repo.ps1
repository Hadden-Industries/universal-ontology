<#
.SYNOPSIS
    Bootstraps local repository configurations and binds version-controlled Git hooks.
    Engineered for dynamic path resolution, allowing execution from any nested utility directory 
    regardless of the invocation shell's current working directory.
#>
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$TargetHooksDirectory = ".githooks"

function Invoke-GitConfigurationBind {
    # 1. Precondition Validation: Verify runtime dependencies
    if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
        Write-Error "CRITICAL_FAILURE: Git executable not detected in environment PATH. Dependency validation failed."
        exit 1
    }

    # 2. Context Anchor: Validate script execution origin
    if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
        Write-Error "CRITICAL_FAILURE: Execution context unbound. Runtime failed to populate `$PSScriptRoot."
        exit 1
    }

    # 3. Context Resolution: Inject script physical path into Git boundary resolution
    $RepoRoot = git -C $PSScriptRoot rev-parse --show-toplevel 2>$null
    
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($RepoRoot)) {
        Write-Error "CRITICAL_FAILURE: Execution context boundary violation. Unable to resolve Git repository root origin from $PSScriptRoot."
        exit 1
    }

    # 4. Context Mutation: Shift execution to the verified repository root
    Set-Location -Path $RepoRoot

    # 5. Idempotent Provisioning: Ensure target hooks directory exists at the root
    if (-not (Test-Path -Path $TargetHooksDirectory -PathType Container)) {
        Write-Output "PROVISIONING: Initializing $TargetHooksDirectory directory boundary..."
        New-Item -ItemType Directory -Path $TargetHooksDirectory | Out-Null
    }

    # 6. Configuration Binding: Route hook execution to the version-controlled directory
    Write-Output "BINDING: Re-routing execution vector core.hooksPath to $TargetHooksDirectory..."
    git config core.hooksPath $TargetHooksDirectory

    # 7. Post-Execution Validation
    if ($LASTEXITCODE -ne 0) {
        Write-Error "CRITICAL_FAILURE: Git configuration mutation failed during execution phase."
        exit 1
    }

    Write-Output "SUCCESS: Repository initialization sequence complete. Deterministic hook constraints applied."
}

Invoke-GitConfigurationBind