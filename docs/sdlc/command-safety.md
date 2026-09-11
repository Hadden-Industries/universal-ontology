# Native destructive-command protection

Package 1.0.0 · Pre-release · CMD-01 initial setup guide.
Current operator selection and accepted host scope: [adoption record](adoption.md#command-safety).

**Bootstrap owner decision:** Max explicitly authorized DCG 0.14.0 use in this repository.
The upstream licence still includes the non-standard OpenAI/Anthropic rider;
this is not plain MIT or a claim of an upstream written exception. See
[the recorded rights decision](package-reuse-assessment.md#dcg-owner-decision).
Installation/configuration and host acceptance remain separately scoped actions.

## 1. Decision and scope

Use the native **Destructive Command Guard (DCG)** implementation maintained at
`Dicklesworthstone/destructive_command_guard` rather than expanding our hand-written
Git/rm patterns. This adopts a specialist implementation, not a claim that every
command is safe or intercepted. Candidate configuration and inert protocol-probe
orchestration are included. The adoption record identifies the later approved
activation and bounded host evidence; this guide is not an acceptance record for
another host or execution path.

The reviewed bootstrap candidate was **v0.14.0**, published September 1, 2026, source commit
`581accd259ed2f8294a7e3866d1489eeaaa58b19` (peeled from the annotated tag). Its Git tag
is unsigned according to GitHub; this is distinct from release-binary signature
verification. The exact source identity is recorded in `.sdlc/dcg/UPSTREAM.json`.
Recheck latest stable under VER-01 before actual installation, then pin the selected
identity. Do not confuse an exact pin with proof that the release is still current.

### Responsibility split

| Component | Owns | Does not establish |
|---|---|---|
| Native DCG hook | Classifies covered command strings and returns its protocol decision | Task authority, complete command semantics, all execution paths |
| Native Codex sandbox/permissions | Capability and access boundaries where enforced | Requirement correctness or an outcome |
| Project lifecycle rules | Requests/denies specified merge/Issue operations | Exhaustive matching of every CLI/API/MCP spelling |
| GitHub permissions/rulesets | Remote write and merge authority | Local command safety |
| SDLC verification and Stop hook | Required evidence and local lifecycle state | Application security or tamper-proof enforcement |
| Codex Security | Application vulnerability assessment/remediation | General command dispatch protection |
| Cleanup policy | Ownership, consumers, retention and disposal conditions | A blanket permission to delete a temporary directory |

DCG is an **executable**, not a new skill, MCP server or Codex Security plugin.
Install one native hook per covered dispatch. Do not wrap it in a home-written
classifier, treat its denial as an exit-code check, or ask every task to invoke it.
A native hook denial normally exits **0** and supplies `permissionDecision: deny`
in minimal JSON; an allowed hook is silent and exits 0. An error is not a denial.
Sources: [S1], [S2].

## 2. Initial control architecture

`.codex/rules/default.rules` contains only project-specific lifecycle rules for
Issue deletion, Issue editing and PR merge. There is no general Git/rm catalogue,
transition patch or compatibility fallback. Provider permissions, sandboxing and
accountable decisions enforce different boundaries from a shell classifier.

The repository `.codex/hooks.json` Stop hook remains the evidence control. An
approved native DCG installer may register its user hook separately, preserving
coexisting hooks, **only after LIC-01 clearance and operator authorization**. The
example under `.sdlc/dcg/` is not auto-discovered. No global file is changed by this
package. Install one native synchronous hook, not duplicate wrappers.

Before the guard's rights and actual host operation are established, operations
requiring it remain blocked or operator-only under effective capability restrictions.
Do not compensate by writing a new generic parser or treating advisory rules as
complete protection.

## 3. Native policy candidate

Review `.sdlc/dcg/operator-config.example.toml` and merge it with the operator's
approved policy. It is deliberately **not** `.dcg.toml` and is not auto-loaded.
Use the installed consumer to validate it; do not write a shadow DCG validator.

The candidate config enables `strict_git`, `platform.github`, `cicd.github_actions`
and the four Windows packs. Core Git/filesystem and default disk protection remain
in effect. It sets matched-rule policy to `deny`, malformed-input handling to
`fail_closed`, unverified decisions to `deny`, and disables embedded-language fallback
on timeout/parse error. The documented update/self-heal settings are disabled/pinned
for reviewed deployment; they must not silently change the assessed environment.
History/logging are not automatically enabled because their command arguments may
contain sensitive material. Retain controlled acceptance evidence separately.
Sources: [S3], [S4], [S5].

### Deliberate strictness, not a universal preference

`strict_git` catches force-with-lease as well as ordinary force pushes. It also
blocks rebase, amend, cherry-pick, bulk staging and worktree removal. This is a
conservative agent default for the proposed pipeline, not a claim that those Git
operations are intrinsically wrong. A human operator may perform approved maintenance
or grant the narrow supported exception after inspecting scope and recovery.
Do not evade a worktree-removal block by deleting the directory through another tool.

Ordinary `git add -- <specific paths>` and a normal commit are included as positive
controls. Run the test corpus with the actual tool; if its native policy blocks a
necessary safe workflow, preserve the failure and resolve the policy deliberately.
Do not change all denies to warnings or create a local regex bypass. Source: [S4].

Enable additional native leaves only where used: for example `cloud.aws`, `storage.s3`,
`secrets.aws_secrets`, `database.postgresql`, or `containers.docker`. Secret-value
exposure has a distinct opt-in policy; mutation packs do not by themselves establish
confidentiality. Do not enable all packs or a broad Windows preset without assessing
its dependencies and friction. Source: [S1].

### Host-owned policy, especially on Windows

DCG's documented user path is `~/.config/dcg/config.toml`. Explicit `DCG_CONFIG`
selection gives a file full configuration authority; it is not the same as the
monotonic hardening of automatically discovered repository policy. Native Windows
currently ignores automatic project `.dcg.toml` discovery and implicit Unix-style
system configuration. Use the user file or a deliberately selected protected path,
then inspect `dcg config --format json` and the actual hook process. Source: [S3].

Do not point a privileged production hook at this agent-editable checked-out example.
Use a reviewed copy deployed by the operator/administration. Protect binary, policy,
hook/trust settings and exception stores from the implementing identity where possible.
Environment overrides, allowlists and bypass variables have authority; audit them.
Running as the same unrestricted OS account as the operator is not strong tamper
resistance. This integration does not claim to fix that deployment architecture.

## 4. Install the approved native release

### Native Windows / PowerShell

Do this as an **operator installation**, not an implementation subagent task. Preserve
existing user configuration. The upstream installer can configure every supported
agent it detects, not only Codex; use `-NoConfigure` and the manual native-hook route
below if only binary installation is authorized. Source: [S6].

```powershell
$Version = 'v0.14.0'
$SourceCommit = '581accd259ed2f8294a7e3866d1489eeaaa58b19'
$SetupDirectory = Join-Path $env:TEMP ('dcg-setup-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $SetupDirectory | Out-Null
$Installer = Join-Path $SetupDirectory 'install.ps1'
$InstallerUri = "https://raw.githubusercontent.com/Dicklesworthstone/destructive_command_guard/$SourceCommit/install.ps1"
Invoke-WebRequest -Uri $InstallerUri -OutFile $Installer
Get-FileHash -LiteralPath $Installer -Algorithm SHA256
# STOP: review the downloaded script/source and independently approved trust key.
# Have minisign provisioned through an approved mechanism. Do not drop the
# requirement merely because signature tooling is unavailable.
$DcgDirectory = Join-Path $HOME '.local/opt/dcg/0.14.0'
& $Installer -Version $Version -Dest $DcgDirectory -RequireMinisign -Verify
if (-not $?) { throw 'DCG installation/verification failed; do not rely on this installation.' }
$Dcg = Join-Path $DcgDirectory 'dcg.exe'
& $Dcg --version
```

The pinned installer plus `-RequireMinisign` uses upstream's release-integrity
mechanism; the printed checksum alone is not authentication. Inspect the selected
key and release under your normal supply-chain approval. An existing installation
may instead be retained/upgraded through its approved management system; the goal
is a tested exact identity, not a second conflicting installation. Sources: [S1], [S6].

Inspect/merge `.sdlc/dcg/operator-config.example.toml` into the approved user policy;
do not blindly overwrite an existing config. Capture actual loaded configuration
and the deployed file digest. Then restart Codex as necessary, open **`/hooks`** and
review/trust the actual synchronous hook. Verify its enabled state rather than
creating fabricated trust entries. `dcg doctor --strict` must be assessed with its
full output: unrelated configured harness problems may need separate resolution,
and a skip is not success. Sources: [S2], [S7], [S8].

```powershell
& $Dcg doctor --strict
if ($LASTEXITCODE -ne 0) { throw 'DCG health/enablement has unresolved failures.' }
& $Dcg config --format json
if ($LASTEXITCODE -ne 0) { throw 'DCG effective configuration could not be read.' }
& $Dcg packs
```

### Binary-only or centrally managed deployment

The same PowerShell installer supports `-NoConfigure` to leave all agent-hook files
alone. Merge the native example into the approved existing `~/.codex/hooks.json`
(or corresponding `CODEX_HOME` deployment after verifying how your installer resolves
it). Replace both placeholder paths with approved absolute executable paths. Remove
the unused OS command entry if appropriate. Never replace the entire hooks document.
The installer-default matcher `Bash` is intentional: current Codex normalizes shell
and supported unified-exec calls to that name. Do not substitute event/log names.

`.sdlc/dcg/codex-hook.example.json` is a merge example, not an executable installer.
Keep it synchronous: an asynchronous hook cannot block the originating operation.
Avoid two DCG hooks in user and project scopes. Under managed-only Codex hooks,
user/project hooks may be ignored; the administrator must deploy DCG through the
managed mechanism and also preserve the SDLC Stop policy there. Do not flip
managed-only settings casually because that can exclude unrelated controls. Source: [S8].

### Linux/macOS or WSL

Use the upstream pinned release installer/release binaries for that OS under the same
signature, source review and exact-identity process. Inspect the pinned installer’s
own help before execution. Do not pipe `main` or an unreviewed `latest` script into a
shell, and do not treat a Windows installation as proof of WSL coverage or vice versa.
The checks below accept an absolute native executable path on any supported host.
No Windows binary, release key file or upstream installer is bundled here.

## 5. Verify the candidate protocol without executing destructive commands

The helper **only sends command strings as JSON input to DCG**. It never executes
those strings. It uses a fresh home/config/working directory, clears inherited
bypasses and credentials, and disables DCG hook self-healing. This is an isolated
candidate-policy test, **not** a test of your deployed user's effective configuration.
Native system policy may still contribute through DCG precedence; inspect its
recorded effective configuration. This isolates user/home state, not the entire OS.
Only run a trusted reviewed binary/config. Ordinary subprocess isolation is not an
OS sandbox for an arbitrary malicious executable.

```powershell
$Run = [guid]::NewGuid().ToString()
node scripts/runRepositoryPython.js scripts/probe_dcg_hook_protocol.py `
  --dcg $Dcg `
  --config .sdlc/dcg/operator-config.example.toml `
  --expected-version 0.14.0 `
  --output ".sdlc/tmp/dcg-protocol/$Run/report.json"
if ($LASTEXITCODE -ne 0) { throw 'Candidate DCG protocol/schema checks did not pass.' }
```

The helper invokes `dcg config schema` and validates TOML parsed by `tomllib` with
the existing `jsonschema` dependency against the **consumer's generated schema**.
It also invokes `dcg config --format json` and preserves the native output rather
than reimplementing configuration precedence. It records version, hashes, native
stdout/stderr, exit status and each actual hook result. Source: [S5].

The fixture list contains 26 policy expectations including safe Git/test commands,
force option permutations, force-with-lease, history rewriting, deletion and Windows
forms. These are test inputs, not a runtime denylist. Unknown/malformed replies or
wrong/missing versions fail the check. No binary means `not-run` with a nonzero exit.
The unit tests use a stub native process response and prove only this helper's
orchestration and result handling; they do not establish DCG detection quality.

Retain the result under the accepted evidence policy before cleaning local scratch.
A change to packs/version/config needs a new run. Do not modify an expectation
merely because the candidate failed it; inspect the semantic cause and route any
necessary policy decision. A native config schema pass alone is not effective
policy or interception proof.

## 6. Initial real-host acceptance

Complete [dcg-acceptance.md](dcg-acceptance.md) for the actual installed Codex surface,
OS, parent/subagent path, permissions and tool versions. Use upstream protocol and
real-Codex harnesses where suitable, pinning the same source. Their real-agent
harness may exit successfully with a clearly reported **skip** when authentication,
quota or network is absent; only actual executed interception counts. Source: [S2].

Use entirely disposable Git repositories/data with no credentials or real remotes.
A blocked-action result requires both an attributable native DCG `PreToolUse`
decision in the runtime and unchanged sentinel/working-tree state. Agent refusal,
a different rule's prompt, or a missing executable is not proof that DCG intercepted.
Run attribution tests in an isolated approved configuration. A block from another
control is useful protection but not proof that DCG received the command.

Mandatory contextual challenges include checkout/restore during a **real** interrupted
rebase, literal temporary directories, Windows command wrappers and the actual
interactive path. DCG documents automatic rebase recovery allowances; this package
has not established that `strict_git` overrides them. Either demonstrate the required
protection with supported native controls, adopt independent capability restrictions
that genuinely prevent the dangerous state/action, or keep reliance blocked for that
surface. A prompt telling the agent not to do it is not a substitute. Source: [S1].

Current OpenAI docs say ordinary shell and `exec_command` receive `PreToolUse` as
`Bash`, while later `write_stdin` input does **not** run `PreToolUse` again. Some paths
can opt out; MCP, direct file tools and script internals are not made safe by DCG
inspecting a shell command string. The pinned DCG integration document contains an
older, broader unified-exec warning. Prefer current host documentation and observed
versioned behaviour; do not infer that either source proves your installation. Source: [S8].

After actual rights clearance and accepted host evidence, record the exact guard,
config, hook and runtime identities in the protected environment record. Native
hook reload/trust and a safe smoke check are required. This authorizes only the
recorded surfaces; it does not approve release or prove general command safety.
No retirement patch or migration step exists in this pre-release package.

## 7. Operator response during ordinary work

**Allowed command:** still check task scope and disposal/approval conditions. A known
safe primitive can be used wrongly; proceed only within actual authority.

**Denied command:** retain the rule/reason and inspect the intended effect. Prefer a
truly non-destructive alternative that preserves the objective and accepted data.
If the operation is required, stop that operation and seek the existing accountable
owner's exact exception. Do not auto-add allowlists, set bypass variables, change
config/pack/trust state, restart under a weaker identity or pipe equivalent effects
into another execution channel. Keep other independently safe work within scope.

**Guard error or unverified path:** report it as missing protection, keep/lower the
permitted automation surface and repair through the approved deployment route.
Never interpret 'hook failed', timeout, skipped trust or absence of a banner as
permission. Technical `ask` outcomes are not human approval when an auto-approver
can answer them; the conservative candidate selects deny instead. Source: [S3].

**Approved exception:** use the installed native narrowly scoped mechanism only
after understanding its exact target binding and lifetime. Record approver, decision,
command, target/cwd, expected effect, recovery plan and expiry/use count. Broad
`allowlist add strict_git:*`, blanket shell allowances or environment bypasses are
not routine solutions. Host/admin control is needed to prevent self-grants; the
hook alone cannot protect its own files from an unrestricted same-account agent.

**Rollback:** restore a reviewed previous binary/config/control set; restrict affected
automation and retain the failure evidence. Do not automatically uninstall DCG or
restore old prefix rules and announce equivalent protection. Old rules were incomplete.
Preserve unrelated native/SDLC hooks and configurations throughout.

### Diagnose a suspected benign-command rejection

Keep the original denied operation and the actual native result. A successful
shorter command or explicit-dialect diagnostic is comparison evidence, not proof
that the original protected dispatch is repaired. Separate a valid safe command
from a quoting or argument-construction error; correct intended semantics as well
as classification.

For the affected occurrence, identify the requested tool/shell/login/cwd, actual
selected executable and arguments, permitted raw hook request, native protocol
and resolved dialect where observable, host and DCG versions, effective native
configuration and loaded packs, and hook enabled/trusted state. Record missing
facts rather than infer them from defaults. The canonical hook name `Bash` is not
proof that the command executes in a POSIX shell. A model-requested shell is not
necessarily the effective shell after host resolution.

Keep original and derived/redacted payloads separately identified. Use existing
protected operational evidence storage; do not turn on blanket command logging,
dump credentials, or install a forwarding/classifying wrapper. A separately
approved observation change must preserve the actual command and native verdict,
keep protocol stdout clean, and have a bounded removal condition.

Native `explain` and hook replay examine text as data. Their process exit codes,
JSON decisions and actual host interception establish different facts. A silent
reply is not proof that an unsupported request was classified. The repository
protocol probe deliberately uses isolated candidate state and synthetic envelopes;
it must not be described as a deployed-policy or host-interception test.

Minimize the full benign input while preserving its valid intended syntax and
material native failure. Retain the original, reduction lineage and safety
neighbors. Choose the repair at the demonstrated producer, host, native DCG or
deployment owner. Do not force all Windows requests to one dialect, relabel a
canonical hook event, mask entire interpreter bodies, or allowlist an executable
merely to remove a false positive.

Qualify the actual installed combination after repair. Require the original safe
semantics through the protected host, and corresponding forbidden-operation text
still denied as inert native diagnostic input. Where the accepted work package
prohibits real destructive testing, that boundary overrides the broader example
matrix: use only non-destructive-by-construction host challenges or record the
unproved subclaim and retain its restriction. Another control's block, a missing
executable, an absent-target error or agent refusal is not native DCG attribution.

An upstream fix, current release number, successful installation or `doctor`
result does not establish propagation into the running host. Retain the local
acceptance item until its installed-path criteria pass. Continue other independent
authorised work without retrying the denied effect through a weaker channel.

For the Windows occurrence in [Issue 48](https://github.com/Hadden-Industries/universal-ontology/issues/48),
selecting PowerShell explicitly on `exec_command` still produced the native
`core.git:branch-force-delete` denial on September 11, 2026. The inspected Codex
0.153.4 producer emits the canonical `Bash` name and command text without the
selected shell. The inspected DCG 0.14.1 source deliberately retains an unknown
dialect for ambiguous Windows Codex requests rather than trusting that name.
This is source-supported evidence of a producer/consumer metadata gap, not a
captured runtime envelope or proof of the desktop binary's exact source. Sources:
[S10], [S11]. Keep the original host failure and inert dialect comparisons;
do not prescribe an explicit shell argument alone as a demonstrated repair.

## 8. Sources and verification boundaries

- [S1] [DCG README at the reviewed source](https://github.com/Dicklesworthstone/destructive_command_guard/blob/581accd259ed2f8294a7e3866d1489eeaaa58b19/README.md): defaults, packs, update/exception behaviour and limitations.
- [S2] [Native Codex integration](https://github.com/Dicklesworthstone/destructive_command_guard/blob/581accd259ed2f8294a7e3866d1489eeaaa58b19/docs/codex-integration.md): protocol, installer ownership, doctor/trust, native tests and skip behaviour.
- [S3] [DCG configuration](https://github.com/Dicklesworthstone/destructive_command_guard/blob/581accd259ed2f8294a7e3866d1489eeaaa58b19/docs/configuration.md): precedence, project trust, Windows limits, policies and native packs.
- [S4] [Strict Git pack](https://github.com/Dicklesworthstone/destructive_command_guard/blob/581accd259ed2f8294a7e3866d1489eeaaa58b19/docs/packs/strict_git.md): force-with-lease and workflow restrictions.
- [S5] [Consumer-generated configuration schema](https://github.com/Dicklesworthstone/destructive_command_guard/blob/581accd259ed2f8294a7e3866d1489eeaaa58b19/config.schema.json): native `dcg config schema` and supported settings.
- [S6] [Pinned native Windows installer](https://github.com/Dicklesworthstone/destructive_command_guard/blob/581accd259ed2f8294a7e3866d1489eeaaa58b19/install.ps1): reviewed-version, destination, signature and binary-only options.
- [S7] [v0.14.0 release](https://github.com/Dicklesworthstone/destructive_command_guard/releases/tag/v0.14.0): September 1, 2026 release and hook reachability checks.
- [S8] [Official Codex hooks](https://developers.openai.com/codex/hooks/), checked September 7, 2026: current shell/unified-exec coverage, stdin limitations, trust and managed hooks.
- [S9] [Official Codex rules](https://developers.openai.com/codex/rules/): prefix-based rules and native limitations.
- [S10] [Codex 0.153.4 exec command hook producer](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs): `pre_tool_use_payload` retains command text but not the selected shell.
- [S11] [DCG 0.14.1 hook source at its reported build commit](https://github.com/Dicklesworthstone/destructive_command_guard/blob/9569d4f181e43e7bdd4fba254834762a092b4b29/src/hook.rs): `codex_host_shell_dialect` documents missing producer metadata and conservative Windows resolution.

The native-policy choices are proposed repository policy, not a scientific finding
or an independent audit of DCG. Source identity is not installed-binary identity;
syntax checks, protocol tests, host interception and governance approval are distinct.
