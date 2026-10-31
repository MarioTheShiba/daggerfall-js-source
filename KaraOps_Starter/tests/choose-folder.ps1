Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $env:KARAOPS_PICK_TITLE)
$picker = $null
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    $picker = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
    if ($picker) { break }
    Start-Sleep -Milliseconds 250
}
if (!$picker) { throw 'Folder dialog not found' }
$editCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1148')
$edit = $picker.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $editCondition)
if (!$edit) {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type 'using System; using System.Runtime.InteropServices; public class PickerFocus { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l); }'
    [PickerFocus]::SetForegroundWindow([IntPtr]$picker.Current.NativeWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait('^l')
    Start-Sleep -Milliseconds 500
    $keys = $env:KARAOPS_PICK_PATH -replace '([+^%~(){}\[\]])', '{$1}'
    [System.Windows.Forms.SendKeys]::SendWait($keys)
    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
    Start-Sleep -Seconds 1
    [PickerFocus]::SendMessage([IntPtr]$picker.Current.NativeWindowHandle, 0x111, [IntPtr]1, [IntPtr]::Zero) | Out-Null
    exit 0
}
$value = $edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
$value.SetValue($env:KARAOPS_PICK_PATH)
$buttonCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1')
$button = $picker.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition)
$button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
