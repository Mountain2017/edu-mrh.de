<#
  Verknüpft den Geheim-Ordner (Cloud-Sync, außerhalb des Repos) mit dem Repo.
  Er enthält zugaenge.md (PINs, Startcodes, Passwörter) und alle material/-
  bzw. Material_*-Ordner im selben Pfad wie im Repo. Im Repo entstehen nur
  Verknüpfungen (Junctions), die .gitignore ausschließt: geheim/ im Repo-Root
  und je Thema <pfad>/material/. Nie `git clean -x`/`-X` ausführen.

  Einmal je Gerät (macOS: tools/geheim-verlinken.sh):
    powershell -ExecutionPolicy Bypass -File tools\geheim-verlinken.ps1 -Quelle "<Sync-Ordner>\edu-mrh.de"
  Später (neue Themen im Sync-Ordner): ohne -Quelle, dann gilt das Ziel von geheim/.
  -Uebernehmen: lokale material/-Ordner, die im Sync-Ordner fehlen, dorthin
  verschieben und verknüpfen (sonst nur auflisten).
#>
param([string]$Quelle, [switch]$Uebernehmen)
$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $PSScriptRoot
$Link = Join-Path $Repo 'geheim'

function Ist-Link($p) {
    (Test-Path -LiteralPath $p) -and [bool]((Get-Item -LiteralPath $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)
}
function Ziel-Von($p) {
    $t = (Get-Item -LiteralPath $p -Force).Target
    if ($t -is [array]) { $t = $t[0] }
    ([string]$t).TrimEnd('\')
}
function Relativ($p) { $p.Substring($Repo.Length).TrimStart('\') }

# oberste Ordner namens material bzw. Material_* (ohne Verknüpfungen, .git, geheim)
function Material-Ordner($wurzel) {
    $erg = @()
    $stapel = New-Object System.Collections.Stack
    $stapel.Push($wurzel)
    while ($stapel.Count) {
        foreach ($k in Get-ChildItem -LiteralPath $stapel.Pop() -Directory -Force) {
            if ($k.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
            if ($k.Name -in '.git', 'node_modules') { continue }
            if ($k.Name -ceq 'material' -or $k.Name -clike 'Material_*') { $erg += $k.FullName }
            else { $stapel.Push($k.FullName) }
        }
    }
    $erg
}

function Verlinke($ziel, $pfad) {
    $name = Relativ $pfad
    if (Ist-Link $pfad) {
        if ((Ziel-Von $pfad) -eq $ziel) { Write-Host "ok        $name" }
        else { Write-Warning "$name zeigt auf $(Ziel-Von $pfad), erwartet $ziel" }
    } elseif (Test-Path -LiteralPath $pfad) {
        if (-not (Get-ChildItem -LiteralPath $pfad -Force)) {
            Remove-Item -LiteralPath $pfad
            New-Item -ItemType Junction -Path $pfad -Target $ziel | Out-Null
            Write-Host "verknüpft $name"
        } else {
            Write-Warning "$name gibt es lokal und im Sync-Ordner: zusammenführen, lokalen Ordner löschen, Skript erneut starten"
        }
    } else {
        New-Item -ItemType Directory -Force (Split-Path -Parent $pfad) | Out-Null
        New-Item -ItemType Junction -Path $pfad -Target $ziel | Out-Null
        Write-Host "verknüpft $name"
    }
}

if (-not $Quelle) {
    if (Ist-Link $Link) { $Quelle = Ziel-Von $Link }
    else { throw 'Erster Aufruf: -Quelle "<Sync-Ordner>\edu-mrh.de" angeben.' }
}
if (-not (Test-Path -LiteralPath $Quelle -PathType Container)) { throw "Ordner fehlt: $Quelle" }
$Quelle = (Get-Item -LiteralPath $Quelle).FullName.TrimEnd('\')

Verlinke $Quelle $Link
foreach ($d in Material-Ordner $Quelle) {
    Verlinke $d (Join-Path $Repo $d.Substring($Quelle.Length).TrimStart('\'))
}

# lokale material/-Ordner, die es im Sync-Ordner noch nicht gibt
foreach ($d in Material-Ordner $Repo) {
    $rel = Relativ $d
    $ziel = Join-Path $Quelle $rel
    if (Test-Path -LiteralPath $ziel) { continue }
    if ($Uebernehmen) {
        New-Item -ItemType Directory -Force (Split-Path -Parent $ziel) | Out-Null
        Move-Item -LiteralPath $d -Destination $ziel
        New-Item -ItemType Junction -Path $d -Target $ziel | Out-Null
        Write-Host "übernommen und verknüpft $rel"
    } else {
        Write-Host "nur lokal $rel  (mit -Uebernehmen in den Sync-Ordner verschieben)"
    }
}
