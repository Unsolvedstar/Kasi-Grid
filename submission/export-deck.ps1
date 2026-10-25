# Exports the deck to PDF with PowerPoint (needs Microsoft PowerPoint installed). Run from the repo root:
#   powershell -File submission/export-deck.ps1
$root = Split-Path -Parent $PSScriptRoot
$pptx = Join-Path $root 'submission\Kasi-Grid-deck.pptx'
$pdf = Join-Path $root 'submission\handin\02-Pitch-Deck.pdf'
New-Item -ItemType Directory -Force (Split-Path $pdf) | Out-Null
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($pptx, $true, $false, $false)   # read-only, untitled, no window
  $p.SaveAs($pdf, 32)                                          # 32 = ppSaveAsPDF
  $p.Close()
} finally {
  $app.Quit()
}
Write-Output "Wrote $pdf"
