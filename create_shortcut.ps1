$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "MarkItDown Studio.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "pythonw.exe"
$Shortcut.Arguments = "`"$PSScriptRoot\MarkItDown_App.pyw`""
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.Description = "Microsoft MarkItDown Studio"
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully at: $ShortcutPath"
