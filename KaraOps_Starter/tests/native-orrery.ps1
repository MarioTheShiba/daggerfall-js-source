param([Parameter(Mandatory=$true)][string]$ExecutablePath,[string]$EvidenceDir='release/verification/v08/native')
# Reuse KaraOps' native accessibility harness; no debugging endpoint or game interaction.
$driver=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'native-hunter.ps1') -Raw
$prefix=$driver.Substring(0,$driver.IndexOf("`ntry {"))
$suffix=$driver.Substring($driver.LastIndexOf("`n} catch {"))
$body=@'
try {
 $null=Wait-Text 'KaraOps v\s*0.8.0' 30
 Click 'Orrery Solver'
 Set-Number 'Breach seed' '123';Set-Number 'Hall number' '8'
 Click 'Generate fresh puzzle';$null=Wait-Text 'turns remaining' 15
 $presses=0
 while($presses -lt 37){
  if((Names) -match 'All six clocks match the targets'){break}
  $next=Elements|Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $_.Current.Name.StartsWith('I turned ')}|Select-Object -First 1
  if(!$next){throw 'Missing single-turn progress button'}
  Click $next.Current.Name;$presses++
 }
 if((Names) -notmatch 'All six clocks match the targets'){throw 'Elite UI route failed to reach Concord'}
 Screenshot 'portable-elite-concord.png'
 Click 'Edit setup and clocks';Click 'Abyss Dungeon';Set-Number 'Abyss slot' '123';Click 'Generate fresh puzzle'
 $null=Wait-Text 'Abyss slot 123' 15
 $next=Elements|Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $_.Current.Name.StartsWith('I turned ')}|Select-Object -First 1
 if(!$next){throw 'Missing Abyss progress button'};Click $next.Current.Name
 if((Names) -notmatch 'Abyss slot 123'){throw 'Abyss identity lost after a turn'}
 if([IO.File]::ReadAllText((Join-Path (Split-Path $exe) 'KaraOpsData\settings.json')) -ne $settingsBefore){throw 'Folder settings changed'}
 $appPids=@((Get-Process KaraOps -ErrorAction SilentlyContinue).Id)
 $external=@(Get-NetTCPConnection -ErrorAction Stop|Where-Object {$_.OwningProcess -in $appPids -and ($_.State -eq 'Listen' -or $_.RemoteAddress -notin @('127.0.0.1','::1','0.0.0.0','::'))})
 if($external.Count){throw 'Unexpected TCP connection/listener'}
 $record=@{passed=$true;executable=$exe;hash=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash;nativeUIAutomation=$true;remoteDebugging=$false;eliteConcord=$true;confirmedPresses=$presses;abyss=$true;settingsUnchanged=$true;externalTcpSnapshot=$external;nodeNpmOnChildPath=$false}
 $record|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $evidence 'native-orrery.json')
 Write-Output ($record|ConvertTo-Json -Depth 5 -Compress)
'@
& ([scriptblock]::Create($prefix+$body+$suffix)) -ExecutablePath $ExecutablePath -ExpectedVersion '0.8.0' -EvidenceDir $EvidenceDir
