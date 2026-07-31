<#
.SYNOPSIS
    Registra uma tarefa diária no Agendador de Tarefas do Windows para
    executar a automação do foguinho.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\schedule-task.ps1 -Time 09:00
#>
param(
    [string]$Time = "09:00",
    [string]$TaskName = "TikTokStreak"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $node) {
    throw "Node.js não encontrado no PATH. Instale o Node 20+ e tente de novo."
}

$action = New-ScheduledTaskAction -Execute $node -Argument "main.js run" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Envia a mensagem diária do foguinho do TikTok." `
    -Force | Out-Null

Write-Host "Tarefa '$TaskName' agendada para todos os dias às $Time."
Write-Host "Pasta de trabalho: $root"
Write-Host ""
Write-Host "Lembre-se de definir HEADLESS=true no .env para execuções agendadas."
Write-Host "Para remover: Unregister-ScheduledTask -TaskName $TaskName"
