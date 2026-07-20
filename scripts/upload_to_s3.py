#!/usr/bin/env python3
"""
S3 Upload Script for Universal Ontology.
Syncs local files in `/dist/` to 'arn:aws:s3:::haddenindustries-com-static-assets/ontology/'
using the AWS CLI, applying specific content-types and modification-date comparison.
"""

import argparse
import datetime
import json
import mimetypes
import os
import subprocess
import sys
from pathlib import Path

# Defaults
DEFAULT_BUCKET = "haddenindustries-com-static-assets"
DEFAULT_PREFIX = "ontology"


def run_cli_command(command, dry_run=False):
    """Runs an AWS CLI command and returns stdout. Raises CalledProcessError on failure."""
    cmd_str = " ".join(command)
    print(f"[RUNNING] {cmd_str}")
    if dry_run:
        return ""
    
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Command failed: {cmd_str}", file=sys.stderr)
        print(f"[ERROR] stdout:\n{e.stdout}", file=sys.stderr)
        print(f"[ERROR] stderr:\n{e.stderr}", file=sys.stderr)
        raise e


def get_content_type(file_path: Path) -> str | None:
    """
    Returns the Content-Type based on the user's mapping requirements:
    - "rdf.xml": "application/rdf+xml"
    - "owl": "application/rdf+xml"
    - "ttl": "text/turtle; charset=utf-8"
    - files without extension: "application/rdf+xml"
    - files "vocabulary.csv", "vocabulary.json", "vocabulary.xmi": "text/html"
    - others: returns None, allowing AWS CLI to guess Content-Type automatically.
    """
    name_lower = file_path.name.lower()
    
    # Specific file names
    if name_lower in ["vocabulary.csv", "vocabulary.json", "vocabulary.xmi"]:
        return "text/html"
        
    # Compound extension .rdf.xml
    if name_lower.endswith(".rdf.xml"):
        return "application/rdf+xml"
        
    # Regular extensions
    suffix = file_path.suffix.lower()
    if suffix == ".owl":
        return "application/rdf+xml"
    elif suffix == ".ttl":
        return "text/turtle; charset=utf-8"
    elif suffix == ".rdf":
        return "application/rdf+xml"
    elif not suffix:
        return "application/rdf+xml"
        
    return None


def get_s3_objects(bucket: str, prefix: str) -> dict:
    """Lists S3 objects under the prefix and returns a dict mapping key -> metadata."""
    print(f"Listing S3 objects in bucket '{bucket}' under prefix '{prefix}/'...")
    objects = {}
    continuation_token = None
    
    while True:
        command = [
            "aws", "s3api", "list-objects-v2",
            "--bucket", bucket,
            "--prefix", f"{prefix}/"
        ]
        if continuation_token:
            command.extend(["--continuation-token", continuation_token])
            
        stdout = run_cli_command(command)
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
            last_modified = item.get("LastModified")
            size = item.get("Size")
            objects[key] = {
                "LastModified": last_modified,
                "Size": size
            }
            
        continuation_token = data.get("NextContinuationToken")
        if not continuation_token:
            break
            
    print(f"Found {len(objects)} existing objects in S3.")
    return objects


def main():
    parser = argparse.ArgumentParser(description="Upload ontology files to AWS S3.")
    parser.add_argument("--bucket", default=DEFAULT_BUCKET, help=f"S3 bucket name (default: {DEFAULT_BUCKET})")
    parser.add_argument("--prefix", default=DEFAULT_PREFIX, help=f"S3 prefix/directory (default: {DEFAULT_PREFIX})")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without executing them")
    parser.add_argument("--force", action="store_true", help="Force upload all files, ignoring modification dates")
    args = parser.parse_args()

    # Locate the /dist/ directory relative to this script
    script_dir = Path(__file__).resolve().parent
    dist_dir = script_dir.parent / "dist"
    
    if not dist_dir.is_dir():
        print(f"[ERROR] Directory '{dist_dir}' does not exist.", file=sys.stderr)
        sys.exit(1)
        
    # Get existing S3 objects
    try:
        s3_objects = get_s3_objects(args.bucket, args.prefix)
    except Exception as e:
        print(f"[ERROR] Failed to list S3 objects: {e}. Check your AWS credentials/permissions.", file=sys.stderr)
        sys.exit(1)
        
    print("\nScanning local dist directory...")
    
    # Track files and directories
    local_dirs = []
    local_files = []
    
    for root, dirs, files in os.walk(dist_dir):
        root_path = Path(root)
        
        # Track directories
        for d in dirs:
            dir_path = root_path / d
            local_dirs.append(dir_path)
            
        # Track files
        for f in files:
            file_path = root_path / f
            # Rule: ignore .url files in external directory
            if "external" in file_path.parts and file_path.suffix.lower() == ".url":
                print(f"[INFO] Skipping ignored file: {file_path.relative_to(dist_dir)}")
                continue
            local_files.append(file_path)

    # 1. Handle directory creation
    print(f"\nProcessing {len(local_dirs)} directories...")
    for dir_path in sorted(local_dirs):
        rel_dir = dir_path.relative_to(dist_dir)
        s3_dir_key = f"{args.prefix}/{rel_dir.as_posix()}/"
        
        if s3_dir_key not in s3_objects:
            print(f"[CREATE DIR] S3 Key: {s3_dir_key}")
            cmd = [
                "aws", "s3api", "put-object",
                "--bucket", args.bucket,
                "--key", s3_dir_key
            ]
            run_cli_command(cmd, dry_run=args.dry_run)
        else:
            print(f"[SKIP DIR] Already exists in S3: {s3_dir_key}")

    # 2. Handle file uploads
    print(f"\nProcessing {len(local_files)} files...")
    uploads_count = 0
    skips_count = 0
    
    for file_path in local_files:
        rel_file = file_path.relative_to(dist_dir)
        s3_file_key = f"{args.prefix}/{rel_file.as_posix()}"
        content_type = get_content_type(file_path)
        
        # Check if upload is needed
        should_upload = False
        reason = ""
        
        if args.force:
            should_upload = True
            reason = "force upload requested"
        elif s3_file_key not in s3_objects:
            should_upload = True
            reason = "does not exist in bucket"
        else:
            # Compare modification times
            local_mtime = file_path.stat().st_mtime
            local_dt = datetime.datetime.fromtimestamp(local_mtime, tz=datetime.timezone.utc)
            
            s3_mtime_str = s3_objects[s3_file_key]["LastModified"]
            # S3 datetimes usually end with +00:00 or Z
            if s3_mtime_str.endswith('Z'):
                s3_mtime_str = s3_mtime_str[:-1] + '+00:00'
            s3_dt = datetime.datetime.fromisoformat(s3_mtime_str)
            
            if local_dt > s3_dt:
                should_upload = True
                reason = f"local file is newer (local: {local_dt.isoformat()}, s3: {s3_dt.isoformat()})"
                
        if should_upload:
            print(f"[UPLOAD] {rel_file} -> {s3_file_key} | Content-Type: '{content_type or 'CLI Default'}' | Reason: {reason}")
            # aws s3 cp cmd
            cmd = [
                "aws", "s3", "cp",
                str(file_path),
                f"s3://{args.bucket}/{s3_file_key}"
            ]
            if content_type:
                cmd.extend(["--content-type", content_type])
                
            run_cli_command(cmd, dry_run=args.dry_run)
            uploads_count += 1
        else:
            print(f"[SKIP FILE] Up-to-date: {rel_file}")
            skips_count += 1
            
    print(f"\nDone. Uploaded: {uploads_count}, Skipped: {skips_count} (Dry-run: {args.dry_run})")


if __name__ == "__main__":
    main()
