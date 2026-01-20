# Script para actualizar la versión del Service Worker y hacer push
# Uso: .\push-with-update.ps1 [mensaje de commit]

param(
    [string]$CommitMessage = "Actualizar versión del Service Worker y cambios"
)

$swFile = "sw.js"
if (Test-Path $swFile) {
    # Actualizar versión
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $content = Get-Content $swFile -Raw
    
    $content = $content -replace '// VERSION: \d+', "// VERSION: $timestamp"
    $content = $content -replace 'contador-pwa-\d+', "contador-pwa-$timestamp"
    
    Set-Content -Path $swFile -Value $content -NoNewline
    
    Write-Host "Version del Service Worker actualizada a: $timestamp" -ForegroundColor Green
    
    # Agregar todos los cambios
    git add -A
    
    # Verificar si hay cambios
    $status = git status --porcelain
    if ($status) {
        # Hacer commit
        git commit -m $CommitMessage
        
        # Hacer push
        git push
        
        Write-Host "Push completado exitosamente!" -ForegroundColor Green
    } else {
        Write-Host "No hay cambios para hacer commit." -ForegroundColor Yellow
    }
} else {
    Write-Host "Error: No se encontro el archivo sw.js" -ForegroundColor Red
    exit 1
}
