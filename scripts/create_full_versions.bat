@echo off
:: Change directory to where this .bat file lives
cd /d "%~dp0"

"..\\.venv\Scripts\python.exe" ../scripts/merge_owl_imports.py ../dist/iso-iec/11179/-3/ed-4/20260714 ../dist/iso-iec/11179/-3/ed-4/20260714-full
"..\\.venv\Scripts\python.exe" ../scripts/merge_owl_imports.py ../dist/universal/reference-data/20260714 ../dist/universal/reference-data/20260714-full
"..\\.venv\Scripts\python.exe" ../scripts/merge_owl_imports.py ../dist/universal/core/20260714 ../dist/universal/core/20260714-full
"..\\.venv\Scripts\python.exe" ../scripts/merge_owl_imports.py ../dist/universal/extended/20260714 ../dist/universal/extended/20260714-full

pause
