# Exports the deck to PDF with PowerPoint (needs Microsoft PowerPoint installed). Run from the repo root:
#   powershell -File submission/export-deck.ps1                                   (exports Kasi-Grid-deck.pptx)
#   powershell -File submission/export-deck.ps1 -Deck Kasi-Grid-deck-export.pptx   (another file, e.g. if the first is open)
param([string]$Deck = 'Kasi-Grid-deck.pptx')
$root = Split-Path -Parent $PSScriptRoot
$pptx = Join-Path $root (Join-Path 'submission' $Deck)
$pdf = Join-Path $root 'submission\handin\02-Pitch-Deck.pdf'
New-Item -ItemType Directory -Force (Split-Path $pdf) | Out-Null
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($pptx, $true, $false, $false)   # read-only, untitled, no window
  $p.SaveAs($pdf, 32)                                          # 32 = ppSaveAsPDF
  $p.Close()
  Write-Output "Wrote $pdf"
} finally {
  try { if ($app.Presentations.Count -eq 0) { $app.Quit() } } catch { }   # leave PowerPoint running if someone else has files open
}
