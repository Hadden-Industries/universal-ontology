@echo off
:: Change directory to where this .bat file lives
cd /d "%~dp0"

"..\\.venv\Scripts\python.exe" ^
    "xslt_transformer.py" ^
    "..\iso-31073\iso-31073.owl" ^
    "dcterms_description_to_skos_definition.xsl"

pause