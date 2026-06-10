$sourceFile = "d:\sportix\New Text Document.txt"
$lines = Get-Content $sourceFile -Encoding UTF8

New-Item -ItemType Directory -Force -Path "d:\sportix\backend" | Out-Null
New-Item -ItemType Directory -Force -Path "d:\sportix\frontend" | Out-Null

$lines[0..15] | Out-File "d:\sportix\.gitignore" -Encoding utf8
$lines[16..87] | Out-File "d:\sportix\README.md" -Encoding utf8
$lines[88..109] | Out-File "d:\sportix\backend\database.py" -Encoding utf8
$lines[110..329] | Out-File "d:\sportix\backend\init_db.py" -Encoding utf8
$lines[330..491] | Out-File "d:\sportix\backend\main.py" -Encoding utf8
$lines[492..527] | Out-File "d:\sportix\backend\models.py" -Encoding utf8
$lines[528..532] | Out-File "d:\sportix\backend\requirements.txt" -Encoding utf8
$lines[533..1152] | Out-File "d:\sportix\frontend\app.js" -Encoding utf8
$lines[1153..1411] | Out-File "d:\sportix\frontend\index.html" -Encoding utf8
$lines[1412..($lines.Length-1)] | Out-File "d:\sportix\frontend\style.css" -Encoding utf8

Write-Output "Successfully split the files."
