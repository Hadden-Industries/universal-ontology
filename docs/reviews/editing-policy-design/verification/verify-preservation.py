from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
source = (root / "verification/source-snapshot.md").read_text()
page = (root / "wiki/Editing-Policy.md").read_text()
technical = page.split("## Technical reference", 1)[1]
missing = []
for block in re.split(r"\n\s*\n", source.strip()):
    if block.startswith("# "):
        continue
    wanted = re.sub(r"^#{2,3} ", "", block)
    if wanted not in technical:
        missing.append(wanted)
assert not missing, f"Missing source blocks: {missing}"
ids = re.findall(r"^### (EP-[A-Z-]+) —", source, re.M)
for rid in ids:
    assert technical.count(f'<a name="{rid.lower()}"></a>') == 1, rid
assert len(re.findall(r"^- ", technical, re.M)) == 77
print(f"PASS: {len(ids)} clauses; 77 executable bullets; every non-title source block retained.")
print("This verifies snapshot preservation, not policy semantics or live GitHub rendering.")
