# Change directory to where this .ps1 file lives
Set-Location -Path $PSScriptRoot

python.exe upload_to_s3.py --bucket haddenindustries-com-static-assets --prefix ontology --local-dir "../dist/"

Read-Host -Prompt "Press Enter to continue"
