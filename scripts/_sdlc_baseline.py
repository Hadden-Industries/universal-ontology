"""Opaque accepted-plan contracts reused from ONI; no approval authentication.

Native local/remote consumers own object acquisition. This module preserves the
representation and validates its format, never Markdown semantics or URLs.

The three plan contract functions are adapted from ONI's _sdlc_baseline.py
(source blob 87b181bb21e4434d7d00fe45d5376d6b19664c92).

MIT License
Copyright (c) 2026 Maksym Shostak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""
from dataclasses import dataclass
import hashlib
from pathlib import PurePosixPath
import re
import unicodedata

from _commands import SetupError

MAX_BASELINE_BYTES = 1024 * 1024
METADATA_TIMEOUT_SECONDS = 30
ISSUE_BASELINE_PATH = re.compile(r'docs/sdlc/baselines/issue-([1-9][0-9]*)/v([1-9][0-9]*)\.json')
OBJECT_ID = re.compile(r'(?:[0-9a-f]{40}|[0-9a-f]{64})')


def is_canonical_plan_path(path: str) -> bool:
    """Recognize the existing canonical plan contract, including literal Unicode."""
    if not isinstance(path, str) or any(c.isspace() or unicodedata.category(c) == 'Cc' for c in path):
        return False
    supplied = PurePosixPath(path)
    return (supplied.as_posix() == path and not supplied.is_absolute()
            and '\\' not in path and ':' not in path and '..' not in supplied.parts
            and supplied.parts[:2] == ('docs', 'plans')
            and len(supplied.parts) >= 3 and supplied.suffix == '.md')


def require_baseline_path(path: str) -> str:
    """Select the representation by its canonical location, never decode fallback."""
    if isinstance(path, str) and ISSUE_BASELINE_PATH.fullmatch(path):
        return 'issue'
    if is_canonical_plan_path(path):
        return 'plan'
    raise SetupError('Invalid canonical baseline path.')


def require_plan_text(content: object) -> str:
    """Require nonempty opaque text; intent and acceptance remain owner decisions."""
    if not isinstance(content, str) or not content.strip() or '\x00' in content:
        raise SetupError('A plan baseline must contain nonempty UTF-8 text without NUL.')
    return content


def require_acceptance_reference(reference: str) -> None:
    """Reject placeholders without treating a supplied reference as approval."""
    if not isinstance(reference, str) or reference.strip().lower() in {'', 'none', 'n/a', '-', 'pending'}:
        raise SetupError('An inspectable non-placeholder owner decision reference is required.')


def decode_baseline_text(raw: bytes) -> str:
    if len(raw) > MAX_BASELINE_BYTES:
        raise SetupError('Baseline exceeds the 1 MiB byte limit.')
    try:
        return raw.decode('utf-8', errors='strict')
    except UnicodeError as exc:
        raise SetupError('Baseline is not strict UTF-8.') from exc


@dataclass(frozen=True)
class BaselineBlob:
    """A regular native Git object with immutable provenance and exact bytes."""
    repository: str
    revision: str
    path: str
    mode: str
    object_id: str
    raw: bytes

    def __post_init__(self):
        require_baseline_path(self.path)
        if (not isinstance(self.repository, str) or not self.repository
                or not OBJECT_ID.fullmatch(self.revision)
                or not OBJECT_ID.fullmatch(self.object_id)
                or len(self.revision) != len(self.object_id)
                or self.mode not in {'100644', '100755'}):
            raise SetupError('Invalid regular baseline Git identity.')
        if not isinstance(self.raw, bytes) or len(self.raw) > MAX_BASELINE_BYTES:
            raise SetupError('Invalid baseline bytes or exceeded 1 MiB limit.')
        native = b'blob ' + str(len(self.raw)).encode('ascii') + b'\0' + self.raw
        algorithm = 'sha1' if len(self.object_id) == 40 else 'sha256'
        if hashlib.new(algorithm, native).hexdigest() != self.object_id:
            raise SetupError('Baseline bytes do not match the native Git blob identity.')

    def same_entry(self, other: 'BaselineBlob') -> bool:
        """Compare selected entries across authoritative revisions/repositories."""
        return (self.path, self.mode, self.object_id, self.raw) == (
            other.path, other.mode, other.object_id, other.raw)
