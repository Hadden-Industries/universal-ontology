@echo off
:: Change directory to where this .bat file lives
cd /d "%~dp0"

"..\\.venv\Scripts\python.exe" ^
    "xml_to_tsv.py" ^
    "..\reference-data\versions\latest" ^
    "..\core\versions\latest" ^
    "..\extended\versions\latest" ^
    "xml_to_tsv_output.tsv"

pause