#!/usr/bin/env python3
"""
S3 Upload Script for Universal Directory Synchronization.
Syncs local files from any directory (relative or absolute) to an Amazon S3 bucket/prefix
using the AWS CLI. Supports comparing files via CRC64NVME full-object checksums or modification dates.
Requires the 'awscrt' library for hardware-accelerated CRC64NVME calculation.
"""

import argparse
import base64
import datetime
import json
import os
import shutil
import subprocess
import sys
from enum import Enum
from pathlib import Path
from typing import Any

# Ensure awscrt is installed prior to script execution
try:
    from awscrt import checksums  # type: ignore
except ImportError:
    print(
        "[FATAL ERROR] Required dependency 'awscrt' is not installed.\n"
        "This script requires 'awscrt' for native CRC64-NVME checksum calculations.\n"
        "Please install it before running by executing:\n"
        "    pip install awscrt\n"
        "or:\n"
        "    python -m pip install awscrt",
        file=sys.stderr,
    )
    sys.exit(1)


class CompareMode(str, Enum):
    """Supported file comparison modes."""
    CHECKSUM = "checksum"
    MTIME = "mtime"


def calculate_crc64nvme(file_path: Path, chunk_size: int = 1024 * 1024) -> str:
    """
    Calculates the 64-bit CRC64-NVME full-object checksum of a file using awscrt bindings
    and returns it as a Base64-encoded string, matching Amazon S3's native ChecksumCRC64NVME header.
    
    Standard Check Case:
      b"Hello World!" -> Base64 "AuUcyF784aU="
      
    :param file_path: Path to local file.
    :param chunk_size: Read buffer size in bytes (default 1MB).
    """
    crc_val: int = 0
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            crc_val = checksums.crc64nvme(chunk, crc_val)
    return base64.b64encode(crc_val.to_bytes(8, byteorder="big")).decode("ascii")


def run_cli_command(command: list[str], dry_run: bool = False, suppress_log: bool = False) -> str:
    """Runs an AWS CLI command and returns stdout. Bypasses execution only for mutating commands when dry_run=True."""
    cmd_str = " ".join(command)
    if not suppress_log:
        print(f"[RUNNING] {cmd_str}")
    if dry_run:
        return ""
    
    executable = shutil.which(command[0])
    if not executable:
        error_msg = (
            f"Executable '{command[0]}' not found in system PATH.\n"
            "Please ensure the AWS CLI is installed and added to your system environment variables."
        )
        if not suppress_log:
            print(f"[ERROR] {error_msg}", file=sys.stderr)
        raise FileNotFoundError(error_msg)

    full_command = [executable] + command[1:]

    # Pass AWS_PAGER="" and disable stdin to prevent subprocess deadlocks on CLI prompts
    env = os.environ.copy()
    env["AWS_PAGER"] = ""

    try:
        result = subprocess.run(
            full_command,
            capture_output=True,
            text=True,
            check=True,
            stdin=subprocess.DEVNULL,
            env=env
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        if not suppress_log:
            print(f"[ERROR] Command failed: {cmd_str}", file=sys.stderr)
            print(f"[ERROR] stdout:\n{e.stdout}", file=sys.stderr)
            print(f"[ERROR] stderr:\n{e.stderr}", file=sys.stderr)
        raise e


def get_content_type(file_path: Path) -> str | None:
    """
    Returns the Content-Type based on extension and filename rules:
    - "vocabulary.csv", "vocabulary.json", "vocabulary.xmi" -> "text/html"
    - ".rdf.xml", ".owl", ".rdf", no extension -> "application/rdf+xml"
    - ".ttl" -> "text/turtle; charset=utf-8"
    - others -> None (AWS CLI auto-detection)
    """
    name_lower = file_path.name.lower()
    
    # Specific file names
    if name_lower in {"vocabulary.csv", "vocabulary.json", "vocabulary.xmi"}:
        return "text/html"
        
    # Compound extension .rdf.xml
    if name_lower.endswith(".rdf.xml"):
        return "application/rdf+xml"
        
    # Regular extensions
    suffix = file_path.suffix.lower()
    if suffix in {".owl", ".rdf", ""}:
        return "application/rdf+xml"
    elif suffix == ".ttl":
        return "text/turtle; charset=utf-8"
        
    return None


def get_s3_objects(bucket: str, prefix: str, compare_mode: CompareMode) -> dict[str, dict[str, Any]]:
    """Lists S3 objects under the specified prefix and returns a dict mapping key -> metadata."""
    prefix_clean = prefix.strip("/")
    prefix_str = f"{prefix_clean}/" if prefix_clean else ""
    print(f"Listing S3 objects in bucket '{bucket}' under prefix '{prefix_str}'...")
    
    objects: dict[str, dict[str, Any]] = {}
    continuation_token: str | None = None
    
    while True:
        command = [
            "aws", "s3api", "list-objects-v2",
            "--bucket", bucket
        ]
        if prefix_str:
            command.extend(["--prefix", prefix_str])
            
        if continuation_token:
            command.extend(["--continuation-token", continuation_token])
            
        stdout = run_cli_command(command, dry_run=False)
        if not stdout.strip():
            break
            
        try:
            data = json.loads(stdout)
        except json.JSONDecodeError as e:
            print(f"[WARNING] Could not parse S3 JSON response: {e}", file=sys.stderr)
            break
            
        contents = data.get("Contents", [])
        for item in contents:
            key = item.get("Key")
            if not key:
                continue
            objects[key] = {
                "LastModified": item.get("LastModified"),
                "Size": item.get("Size"),
                "ChecksumCRC64NVME": item.get("ChecksumCRC64NVME")
            }
            
        continuation_token = data.get("NextContinuationToken")
        if not continuation_token:
            break

    print(f"Found {len(objects)} existing objects in S3.")
    return objects


def sync_directory_to_s3(
    local_dir: str | Path,
    bucket: str,
    prefix: str,
    compare_mode: CompareMode = CompareMode.CHECKSUM,
    dry_run: bool = False,
    force: bool = False
) -> tuple[int, int]:
    """
    Synchronizes a local directory with an S3 bucket and prefix.
    """
    resolved_dir = Path(local_dir).resolve()
    if not resolved_dir.is_dir():
        raise FileNotFoundError(f"Local directory '{resolved_dir}' does not exist or is not a directory.")

    normalized_prefix = prefix.strip("/")
    s3_objects = get_s3_objects(bucket, normalized_prefix, compare_mode)
    
    print(f"\nScanning local directory: {resolved_dir}...")
    
    local_dirs: list[Path] = []
    local_files: list[Path] = []
    
    for root, dirs, files in os.walk(resolved_dir):
        root_path = Path(root)
        for d in dirs:
            local_dirs.append(root_path / d)
        for f in files:
            file_path = root_path / f
            if "external" in file_path.parts and file_path.suffix.lower() == ".url":
                print(f"[INFO] Skipping ignored file: {file_path.relative_to(resolved_dir)}")
                continue
            local_files.append(file_path)

    # 1. Directory creation placeholders
    print(f"\nProcessing {len(local_dirs)} subdirectories...")
    for dir_path in sorted(local_dirs):
        rel_dir = dir_path.relative_to(resolved_dir)
        rel_posix = rel_dir.as_posix()
        s3_dir_key = f"{normalized_prefix}/{rel_posix}/" if normalized_prefix else f"{rel_posix}/"
        
        if s3_dir_key not in s3_objects:
            print(f"[CREATE DIR] S3 Key: {s3_dir_key}")
            cmd = ["aws", "s3api", "put-object", "--bucket", bucket, "--key", s3_dir_key]
            run_cli_command(cmd, dry_run=dry_run)
        else:
            print(f"[SKIP DIR] Already exists in S3: {s3_dir_key}")

    # 2. File uploads
    print(f"\nProcessing {len(local_files)} files (Compare Mode: {compare_mode.value.upper()})...")
    uploads_count = 0
    skips_count = 0
    
    for file_path in local_files:
        rel_file = file_path.relative_to(resolved_dir)
        rel_posix = rel_file.as_posix()
        s3_file_key = f"{normalized_prefix}/{rel_posix}" if normalized_prefix else rel_posix
        content_type = get_content_type(file_path)
        
        should_upload = False
        reason = ""
        
        if force:
            should_upload = True
            reason = "force upload requested"
        elif s3_file_key not in s3_objects:
            should_upload = True
            reason = "does not exist in bucket"
        else:
            s3_item = s3_objects[s3_file_key]
            
            if compare_mode == CompareMode.CHECKSUM:
                s3_crc = s3_item.get("ChecksumCRC64NVME")
                
                # Lazy load CRC64NVME via head-object only when required for a local file
                if not s3_crc:
                    head_cmd = [
                        "aws", "s3api", "head-object",
                        "--bucket", bucket,
                        "--key", s3_file_key,
                        "--checksum-mode", "ENABLED"
                    ]
                    try:
                        head_out = run_cli_command(head_cmd, dry_run=False, suppress_log=True)
                        if head_out.strip():
                            head_data = json.loads(head_out)
                            s3_crc = head_data.get("ChecksumCRC64NVME")
                            s3_item["ChecksumCRC64NVME"] = s3_crc
                    except subprocess.CalledProcessError:
                        pass

                local_crc = calculate_crc64nvme(file_path)
                
                if not s3_crc:
                    should_upload = True
                    reason = "S3 object missing CRC64NVME checksum"
                elif local_crc != s3_crc:
                    should_upload = True
                    reason = f"checksum mismatch (local: {local_crc}, s3: {s3_crc})"
            elif compare_mode == CompareMode.MTIME:
                local_mtime = file_path.stat().st_mtime
                local_dt = datetime.datetime.fromtimestamp(local_mtime, tz=datetime.timezone.utc)
                
                s3_mtime_str = s3_item.get("LastModified", "")
                if s3_mtime_str.endswith("Z"):
                    s3_mtime_str = s3_mtime_str[:-1] + "+00:00"
                s3_dt = datetime.datetime.fromisoformat(s3_mtime_str)
                
                if local_dt > s3_dt:
                    should_upload = True
                    reason = f"local file is newer (local: {local_dt.isoformat()}, s3: {s3_dt.isoformat()})"

        if should_upload:
            print(f"[UPLOAD] {rel_file} -> {s3_file_key} | Content-Type: '{content_type or 'CLI Default'}' | Reason: {reason}")
            cmd = [
                "aws", "s3", "cp",
                str(file_path),
                f"s3://{bucket}/{s3_file_key}"
            ]
            if content_type:
                cmd.extend(["--content-type", content_type])
                
            run_cli_command(cmd, dry_run=dry_run)
            uploads_count += 1
        else:
            print(f"[SKIP FILE] Up-to-date: {rel_file}")
            skips_count += 1
            
    print(f"\nDone. Uploaded: {uploads_count}, Skipped: {skips_count} (Dry-run: {dry_run})")
    return uploads_count, skips_count


def parse_args() -> argparse.Namespace:
    """Parses command line arguments."""
    parser = argparse.ArgumentParser(
        description="Sync local directory files to an AWS S3 bucket with configurable comparison strategies."
    )
    parser.add_argument(
        "--local-dir",
        type=Path,
        required=True,
        help="Local directory to read from (relative to script or absolute path)."
    )
    parser.add_argument(
        "--bucket",
        type=str,
        required=True,
        help="Target S3 bucket name."
    )
    parser.add_argument(
        "--prefix",
        type=str,
        required=True,
        help="Target S3 prefix/folder path."
    )
    parser.add_argument(
        "--compare-mode",
        type=CompareMode,
        choices=list(CompareMode),
        default=CompareMode.CHECKSUM,
        help=f"Comparison method: 'checksum' (CRC64NVME full object) or 'mtime' (modification date). Default: '{CompareMode.CHECKSUM.value}'."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print actions without executing S3 uploads."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force upload all files regardless of comparison results."
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    
    try:
        sync_directory_to_s3(
            local_dir=args.local_dir,
            bucket=args.bucket,
            prefix=args.prefix,
            compare_mode=args.compare_mode,
            dry_run=args.dry_run,
            force=args.force
        )
    except Exception as e:
        print(f"[FATAL ERROR] {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
