@echo off
:: Change directory to where this .bat file lives
cd /d "%~dp0"

"..\\.venv\Scripts\python.exe" ../scripts/merge_owl_imports.py ../iso-iec11179-3/versions/20260714 ../iso-iec11179-3/versions/20260714-full
"..\\.venv\Scripts\python.exe" ../scripts/merge_owl_imports.py ../reference-data/versions/20260714 ../reference-data/versions/20260714-full
"..\\.venv\Scripts\python.exe" ../scripts/merge_owl_imports.py ../core/versions/20260714 ../core/versions/20260714-full
"..\\.venv\Scripts\python.exe" ../scripts/merge_owl_imports.py ../extended/versions/20260714 ../extended/versions/20260714-full

pause
