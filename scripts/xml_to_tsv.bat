@echo off
:: Change directory to where this .bat file lives
cd /d "%~dp0"

"..\\.venv\Scripts\python.exe" ^
    "xml_to_tsv.py" ^
    "..\dist\universal\reference-data\latest" ^
    "..\dist\universal\core\latest" ^
    "..\dist\universal\extended\latest" ^
    "xml_to_tsv_output.tsv"

pause