# Script para actualizar la versión del Service Worker
# Se puede ejecutar manualmente antes de hacer push

$swFile = "sw.js"
if (Test-Path $swFile) {
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $content = Get-Content $swFile -Raw
    
    # Actualizar la versión
    $content = $content -replace '// VERSION: \d+', "// VERSION: $timestamp"
    $content = $content -replace 'contador-pwa-\d+', "contador-pwa-$timestamp"
    
    # Guardar el archivo
    Set-Content -Path $swFile -Value $content -NoNewline
    
    # Agregar al staging
    git add $swFile
    
    Write-Host "Version del Service Worker actualizada a: $timestamp" -ForegroundColor Green
    Write-Host "Archivo agregado al staging. Puedes hacer commit y push." -ForegroundColor Yellow
} else {
    Write-Host "Error: No se encontro el archivo sw.js" -ForegroundColor Red
    exit 1
}
