param([Parameter(Mandatory=$true)][string]$ExecutablePath,[switch]$Development,[switch]$World,[switch]$Jackpot,[switch]$Large,[switch]$BaselineRepro,[switch]$Companion,[string]$ExpectedVersion='0.6.0',[string]$EvidenceDir='')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type 'using System.Text; using System; using System.Runtime.InteropServices; public class KaraNative { [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern bool SetWindowText(IntPtr h,string text); [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder text,int count); [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint msg,IntPtr w,IntPtr l); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); }'
$exe=(Resolve-Path -LiteralPath $ExecutablePath).Path
$project=(Get-Location).Path
$evidence=if($EvidenceDir){[IO.Path]::GetFullPath($EvidenceDir)}else{Join-Path $project 'release\verification'}
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$settingsBefore=if(!$Development){[IO.File]::ReadAllText((Join-Path (Split-Path $exe) 'KaraOpsData\settings.json'))}else{$null}
$env:ELECTRON_RUN_AS_NODE=$null
$env:ELECTRON_RENDERER_URL=$null
if(!$Development){$env:PATH="$env:SystemRoot\System32;$env:SystemRoot"}
$argsList=@('--force-renderer-accessibility=complete')
if($Development){$argsList=@($project,'--force-renderer-accessibility=complete')}
$beforeCondition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty,'KaraOps')
$previousHandles=@([System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,$beforeCondition)|ForEach-Object {$_.Current.NativeWindowHandle})
$launcher=Start-Process -FilePath $exe -ArgumentList $argsList -WorkingDirectory (Split-Path $exe) -WindowStyle Hidden -PassThru
$script:window=$null
$condition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty,'KaraOps')
for($attempt=0;$attempt -lt 120;$attempt++){
 $script:window=[System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,$condition)|Where-Object {$_.Current.NativeWindowHandle -notin $previousHandles}|Select-Object -First 1
 if($script:window){break};Start-Sleep -Milliseconds 500
}
if(!$script:window){throw 'KaraOps window did not appear'}
function Elements { return $script:window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition) }
function Names { return (@(Elements | ForEach-Object {$_.Current.Name}) -join "`n") }
function Find-Name([string]$name) {
 return Elements | Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and ($_.Current.Name -eq $name -or $_.Current.Name.EndsWith(" $name"))} | Select-Object -First 1
}
function Click([string]$name){$el=Find-Name $name;if(!$el){throw "Missing button: $name"};$el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke();Start-Sleep -Milliseconds 200}
function Wait-Text([string]$pattern,[int]$seconds=360){
 $deadline=[DateTime]::UtcNow.AddSeconds($seconds)
 do {$text=Names;if($text -match $pattern){return $text};if($text -match 'SOURCE_VERSION_MISMATCH|WORLD_ROADS_FAILED|Worker exceeded|Analysis Error'){throw $text};Start-Sleep -Milliseconds 500}while([DateTime]::UtcNow -lt $deadline)
 [IO.File]::WriteAllText((Join-Path $evidence 'native-timeout.txt'),$text);throw "Timeout: $pattern"
}
function Set-Number([string]$prefix,[string]$value){
 $el=Elements | Where-Object {$_.Current.Name.StartsWith($prefix) -and $_.Current.ControlType -in @([System.Windows.Automation.ControlType]::Edit,[System.Windows.Automation.ControlType]::Spinner)} | Select-Object -First 1
 if(!$el){throw "Missing numeric field $prefix"}
 [KaraNative]::SetForegroundWindow([IntPtr]$script:window.Current.NativeWindowHandle) | Out-Null
 $el.SetFocus();Start-Sleep -Milliseconds 150
 $pattern=$null
 if($el.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern)){$pattern.SetValue($value)}else{
  [System.Windows.Forms.SendKeys]::SendWait('^a');Start-Sleep -Milliseconds 100
  foreach($digit in $value.ToCharArray()){[System.Windows.Forms.SendKeys]::SendWait([string]$digit);Start-Sleep -Milliseconds 120}
 }
 Start-Sleep -Milliseconds 200
 [System.Windows.Forms.SendKeys]::SendWait('{TAB}');Start-Sleep -Milliseconds 200
}
function Screenshot([string]$name){
 [KaraNative]::SetForegroundWindow([IntPtr]$script:window.Current.NativeWindowHandle)|Out-Null
 $r=$script:window.Current.BoundingRectangle
 $bitmap=New-Object Drawing.Bitmap([int]$r.Width,[int]$r.Height)
 $graphics=[Drawing.Graphics]::FromImage($bitmap)
 $graphics.CopyFromScreen([int]$r.X,[int]$r.Y,0,0,$bitmap.Size)
 $bitmap.Save((Join-Path $evidence $name),[Drawing.Imaging.ImageFormat]::Png);$graphics.Dispose();$bitmap.Dispose()
}
try {
 $null=Wait-Text 'Your command center' 60
 if((Names) -notmatch [Regex]::Escape($ExpectedVersion)){throw 'Wrong application version'}
 Click 'Dungeon Hunter';Click 'Validate data';$null=Wait-Text 'Data validated'
 $inputHistoryVerified=$false
 if(!$Development){$historyPath=Join-Path (Split-Path $exe) 'KaraOpsData\hunter-history.json';if(Test-Path -LiteralPath $historyPath){$stored=([IO.File]::ReadAllText($historyPath)|ConvertFrom-Json).lastRequest;if($stored){foreach($pair in @(@('Center X (east)',[string]$stored.px),@('Center Y (south)',[string]$stored.py))){$field=Elements|Where-Object {$_.Current.Name -eq $pair[0] -and $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Edit}|Select-Object -First 1;if(!$field -or $field.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value -ne $pair[1]){throw 'Last signed search coordinates did not persist across restart'}};$inputHistoryVerified=$true}}}
 Set-Number 'Effective level (manual)' '30'
 Set-Number 'Center X (east)' $(if($World){'689'}elseif($Large){'785'}else{'780'})
 Set-Number 'Center Y (south)' $(if($World){'-210'}else{'100'})
 Set-Number 'Radius (0' $(if($Large){'0'}else{'20'})
 $elite=Elements|Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::CheckBox -and $_.Current.Name -eq 'Elite only'}|Select-Object -First 1
 if(!$elite){throw 'Missing Elite only checkbox'}
 $toggle=$elite.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern);if($toggle.Current.ToggleState -ne [System.Windows.Automation.ToggleState]::On){$toggle.Toggle()}
 Click 'Scan';$text=Wait-Text 'requested circle complete'
 if(!$Development){$actualRequest=([IO.File]::ReadAllText((Join-Path (Split-Path $exe) 'KaraOpsData\hunter-history.json'))|ConvertFrom-Json).lastRequest;if($actualRequest.px -ne $(if($World){689}elseif($Large){785}else{780}) -or $actualRequest.py -ne $(if($World){-210}else{100}) -or !$actualRequest.eliteOnly){throw 'Native input did not preserve signed coordinates/profile'}}
 $expected=if($World){'High Rock'}elseif($Large){'Elite The Cave of Morkucheus'}else{'Elite Castle Hawkwing'}
 if($text -notmatch [Regex]::Escape($expected)){throw "Missing real result: $expected"}
 if(!$World -and !$Large -and $text -notmatch '75/177'){throw 'Hawkwing population regression'}
 $case=if($World){'world'}elseif($Large){'large'}else{'bay'}
 $selected=Elements|Where-Object {$_.Current.ClassName -eq 'hunter-result selected'}|Select-Object -First 1
 if($selected){try{$selected.GetCurrentPattern([System.Windows.Automation.ScrollItemPattern]::Pattern).ScrollIntoView()}catch{$selected.SetFocus()}}
 Screenshot "native-$case-results.png"
 Click 'Open 2D X-Ray';$null=Wait-Text '2D map ready'
 if($Large){
  $beforeMap=Elements|Where-Object {$_.Current.Name -eq 'Reconstructed dungeon floor map'}|Select-Object -First 1
  if(!$beforeMap){throw 'Large-dungeon map missing before navigation'}
  $mapRuntimeId=$beforeMap.GetRuntimeId() -join ','
  if($BaselineRepro){
   Click 'Calculate navigation';$null=Wait-Text 'NAV_BUDGET' 60
   if(Elements|Where-Object {$_.Current.Name -eq 'Reconstructed dungeon floor map'}){throw 'Expected frozen-v0.6 map-hiding regression was not reproduced'}
   @{baseline=$true;version=$ExpectedVersion;largeDungeon='785,100';error='NAV_BUDGET';mapDisappeared=$true}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $evidence 'v06-map-reproduction.json')
   Write-Output 'Reproduced frozen v0.6 NAV_BUDGET and disappearing X-Ray';return
  }
  Click 'Calculate navigation'
  if(!(Elements|Where-Object {$_.Current.Name -eq 'Reconstructed dungeon floor map'})){throw 'Map disappeared during navigation initialization'}
  Click 'Cancel';$null=Wait-Text 'Analysis cancelled' 30
  if(!(Elements|Where-Object {$_.Current.Name -eq 'Reconstructed dungeon floor map'})){throw 'Map disappeared after cancellation'}
  Click 'Calculate navigation';$null=Wait-Text 'objectives validated' 90
  $afterMap=Elements|Where-Object {$_.Current.Name -eq 'Reconstructed dungeon floor map'}|Select-Object -First 1
  if(!$afterMap -or ($afterMap.GetRuntimeId() -join ',') -ne $mapRuntimeId){throw 'Map DOM was removed/replaced by route calculation'}
 }elseif(!$World){Click 'Calculate navigation';$null=Wait-Text 'Navigation analysis ready';$null=Wait-Text 'objectives validated'}
 if($Companion){
  $summary=Elements|Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $_.Current.Name.StartsWith('Live companion')}|Select-Object -First 1
  if(!$summary){throw 'Missing live companion panel'}
  $summary.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke();$null=Wait-Text 'Enable local receiver' 15
  Set-Number 'Exact approved game origin' 'https://qa.invalid'
  $consent=Elements|Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::CheckBox -and $_.Current.Name.StartsWith('I authorize local telemetry')}|Select-Object -First 1
  $consent.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Toggle()
  Click 'Enable local receiver';$null=Wait-Text 'Receiver:\s+waiting' 30
  $appPids=@((Get-Process KaraOps -ErrorAction SilentlyContinue).Id)
  $listeners=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.OwningProcess -in $appPids})
  if(!$listeners.Count -or @($listeners|Where-Object {$_.LocalAddress -ne '127.0.0.1'}).Count){throw 'Receiver did not bind exclusively to IPv4 loopback'}
  Click 'Disable local receiver';$null=Wait-Text 'Receiver:\s+off' 15
 }

 $text=Names;[IO.File]::WriteAllText((Join-Path $evidence "native-$case-tree.txt"),$text)
 $map=Elements|Where-Object {$_.Current.Name -eq 'Reconstructed dungeon floor map'}|Select-Object -First 1
 if($map){
  $mapCondition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty,'Reconstructed dungeon floor map')
  foreach($container in (Elements)){
   $scroll=$null;if(!$container.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern,[ref]$scroll) -or !$scroll.Current.VerticallyScrollable){continue}
   if(!$container.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$mapCondition)){continue}
   $rect=$container.Current.BoundingRectangle;$target=$map.Current.BoundingRectangle;$range=$rect.Height*(100/$scroll.Current.VerticalViewSize-1)
   if($range -gt 0 -and $target.Width -gt 0){$percent=[Math]::Max(0,[Math]::Min(100,$scroll.Current.VerticalScrollPercent+($target.Top-$rect.Top)/$range*100));$scroll.SetScrollPercent(-1,$percent);Start-Sleep -Milliseconds 250;break}
  }
 }
 Screenshot "native-$case-map.png"

 if($Jackpot){
  $summary=Elements|Where-Object {$_.Current.Name.StartsWith('Universal Jackpot')}|Select-Object -First 1
  if(!$summary){throw 'Missing Universal Jackpot panel'}
  $invoke=$null;if($summary.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$invoke)){$invoke.Invoke()}else{$summary.SetFocus();[System.Windows.Forms.SendKeys]::SendWait(' ')}
  $null=Wait-Text 'Capture all populations' 15
  Click 'Import retained legacy cache';$null=Wait-Text 'retained cache snapshots imported' 60
  Click 'Capture all populations';$null=Wait-Text '91\s+analyzed populations'
  $objective=Elements|Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::ComboBox -and $_.Current.Name -eq 'Jackpot objective'}|Select-Object -First 1
  if(!$objective){throw 'Missing Jackpot objective selector'}
  [KaraNative]::SetForegroundWindow([IntPtr]$script:window.Current.NativeWindowHandle)|Out-Null
  $objective.SetFocus();[System.Windows.Forms.SendKeys]::SendWait('{END}');Start-Sleep -Milliseconds 200
  Click 'Rerank saved capture';$null=Wait-Text 'Reference-roll opportunity only'
  $objective=Elements|Where-Object {$_.Current.ControlType -eq [System.Windows.Automation.ControlType]::ComboBox -and $_.Current.Name -eq 'Jackpot objective'}|Select-Object -First 1
  $objective.SetFocus();[System.Windows.Forms.SendKeys]::SendWait('{HOME}');Start-Sleep -Milliseconds 200
  Click 'Rerank saved capture';Start-Sleep -Seconds 1
  Click 'Inspect captured dungeon';$null=Wait-Text 'Compact capture'
  Click 'Open 2D X-Ray';$null=Wait-Text '2D map ready'
  Click 'Analyze selected coffer';$cofferText=Wait-Text 'Aurum:\s+placement_verified'
  if($cofferText -notmatch 'exact positions withheld'){throw 'Coffer location approval gate missing'}
  Click 'Verify coffer walking route';$null=Wait-Text 'Walking route.*unknown' 120
  Click 'Export Jackpot CSV';Start-Sleep -Seconds 1
  $csvPath=Join-Path (Split-Path $exe) 'KaraOpsData\KaraOps-Jackpot.csv'
  $save=Elements|Where-Object {$_.Current.ClassName -eq 'Button' -and $_.Current.Name -eq 'Save'}|Select-Object -First 1
  if(!$save){throw 'Missing native Save button'}
  $null=[KaraNative]::SendMessage([IntPtr]$save.Current.NativeWindowHandle,0xF5,[IntPtr]::Zero,[IntPtr]::Zero)
  $null=Wait-Text 'Exported.*KaraOpsData.*KaraOps-Jackpot.csv' 30
  $csv=[IO.File]::ReadAllText($csvPath);if($csv -notmatch 'UNKNOWN' -or $csv -notmatch 'sourceFingerprint'){throw 'CSV provenance/unknown odds missing'}
  [IO.File]::WriteAllText((Join-Path $evidence 'native-jackpot-tree.txt'),(Names));Screenshot 'native-jackpot.png'
 }
 $settings=if($Development){$null}else{[IO.File]::ReadAllText((Join-Path (Split-Path $exe) 'KaraOpsData\settings.json'))|ConvertFrom-Json}
 if(!$Development -and [IO.File]::ReadAllText((Join-Path (Split-Path $exe) 'KaraOpsData\settings.json')) -ne $settingsBefore){throw 'Existing folder settings changed'}
 $external=@();if(!$Development){$appPids=@((Get-Process KaraOps -ErrorAction SilentlyContinue).Id);$external=@(Get-NetTCPConnection -ErrorAction Stop|Where-Object {$_.OwningProcess -in $appPids -and ($_.State -eq 'Listen' -or $_.RemoteAddress -notin @('127.0.0.1','::1','0.0.0.0','::'))});if($external.Count){throw 'Unexpected TCP connection or listening port in KaraOps'}}
 $record=@{executable=$exe;case=$case;nativeUIAutomation=$true;remoteDebugging=$false;large=$Large.IsPresent;companion=$Companion.IsPresent;jackpot=$Jackpot.IsPresent;realScan=$true;realMap=$true;navigation=(!$World);savedSettings=$settings;inputHistoryVerified=$inputHistoryVerified;externalTcpSnapshot=$external;hash=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash}
 $record|ConvertTo-Json -Depth 6 -Compress|Add-Content -LiteralPath (Join-Path $evidence 'native-hunter.jsonl')
 Write-Output ($record|ConvertTo-Json -Depth 6 -Compress)
} catch {
 [IO.File]::WriteAllText((Join-Path $evidence 'native-failure-tree.txt'),(@(Elements|ForEach-Object {"$($_.Current.ControlType.ProgrammaticName) | $($_.Current.ClassName) | $($_.Current.Name)"}) -join "`n"));try{Screenshot 'native-failure.png'}catch{};throw
} finally {
 if($script:window){try{$script:window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close()}catch{}}
 if(!$Development){$null=$launcher.WaitForExit(30000)}
}
