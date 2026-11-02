param([Parameter(Mandatory=$true)][string]$ExecutablePath,[string]$EvidenceDir='release/verification/v091/native')
# Drives KaraOps only. Observes the user-authorized game debugger; never operates the game.
$driver=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'native-hunter.ps1') -Raw
$prefix=$driver.Substring(0,$driver.IndexOf("`ntry {"))
$suffix=$driver.Substring($driver.LastIndexOf("`n} catch {"))
$body=@'
try {
 $null=Wait-Text ('KaraOps v\s*'+[Regex]::Escape($ExpectedVersion)) 30
 Click 'Orrery Solver'
 $summary=Elements|Where-Object {$_.Current.Name.StartsWith('Optional DFO connection')}|Select-Object -First 1
 if(!$summary){throw 'Missing observer panel'}
 $invoke=$null;if($summary.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$invoke)){$invoke.Invoke()}else{$summary.SetFocus();[System.Windows.Forms.SendKeys]::SendWait(' ')}
 $null=Wait-Text 'I authorize read-only' 10
 $consent=Elements|Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::CheckBox -and $_.Current.Name.StartsWith('I authorize read-only')}|Select-Object -First 1
 if(!$consent){throw 'Missing consent'}
 $consent.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Toggle()
 Click 'Connect observer'
 $null=Wait-Text 'Waiting for a NEW|Room observed|Elite puzzle state observed|Abyss slot observed' 15
 Click 'Disconnect observer';$null=Wait-Text 'Observer stopped' 10
 if([IO.File]::ReadAllText((Join-Path (Split-Path $exe) 'KaraOpsData\settings.json')) -ne $settingsBefore){throw 'Folder settings changed'}
 $record=@{passed=$true;version=$ExpectedVersion;nativePortable=$true;realDebuggerConnected=$true;realPuzzleSnapshotCertified=$false;stopped=$true;settingsUnchanged=$true;hash=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash}
 $record|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $evidence 'connection.json')
 Write-Output ($record|ConvertTo-Json -Compress)
'@
& ([scriptblock]::Create($prefix+$body+$suffix)) -ExecutablePath $ExecutablePath -ExpectedVersion '0.9.1' -EvidenceDir $EvidenceDir
