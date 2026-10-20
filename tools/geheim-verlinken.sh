#!/usr/bin/env bash
# Verknüpft den Geheim-Ordner (Cloud-Sync, außerhalb des Repos) mit dem Repo –
# macOS/Linux-Fassung von tools/geheim-verlinken.ps1 (Erklärung dort), mit Symlinks.
#
# Einmal je Gerät:  bash tools/geheim-verlinken.sh "<Sync-Ordner>/edu-mrh.de"
# Später:           bash tools/geheim-verlinken.sh            (Ziel von geheim/)
# Lokale material/-Ordner in den Sync-Ordner verschieben: zusätzlich --uebernehmen
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
link="$repo/geheim"
quelle=""; uebernehmen=0
for a in "$@"; do
    case "$a" in --uebernehmen) uebernehmen=1 ;; *) quelle="$a" ;; esac
done
if [ -z "$quelle" ]; then
    if [ -L "$link" ]; then quelle="$(readlink "$link")"
    else echo 'Erster Aufruf: Pfad "<Sync-Ordner>/edu-mrh.de" angeben.' >&2; exit 1; fi
fi
[ -d "$quelle" ] || { echo "Ordner fehlt: $quelle" >&2; exit 1; }
quelle="$(cd "$quelle" && pwd)"

verlinke() {  # $1 = Ordner im Sync-Ordner, $2 = Pfad im Repo
    local name="${2#"$repo"/}"
    if [ -L "$2" ]; then
        if [ "$(readlink "$2")" = "$1" ]; then echo "ok        $name"
        else echo "WARNUNG   $name zeigt auf $(readlink "$2"), erwartet $1" >&2; fi
    elif [ -d "$2" ]; then
        if [ -z "$(ls -A "$2")" ]; then rmdir "$2"; ln -s "$1" "$2"; echo "verknüpft $name"
        else echo "WARNUNG   $name gibt es lokal und im Sync-Ordner: zusammenführen, lokalen Ordner löschen, Skript erneut starten" >&2; fi
    else
        mkdir -p "$(dirname "$2")"; ln -s "$1" "$2"; echo "verknüpft $name"
    fi
}

verlinke "$quelle" "$link"
while IFS= read -r -d '' d; do
    verlinke "$d" "$repo/${d#"$quelle"/}"
done < <(find "$quelle" -type d \( -name material -o -name 'Material_*' \) -prune -print0)

# lokale material/-Ordner, die es im Sync-Ordner noch nicht gibt
while IFS= read -r -d '' d; do
    rel="${d#"$repo"/}"
    [ -e "$quelle/$rel" ] && continue
    if [ "$uebernehmen" = 1 ]; then
        mkdir -p "$(dirname "$quelle/$rel")"; mv "$d" "$quelle/$rel"; ln -s "$quelle/$rel" "$d"
        echo "übernommen und verknüpft $rel"
    else
        echo "nur lokal $rel  (mit --uebernehmen in den Sync-Ordner verschieben)"
    fi
done < <(find "$repo" \( -path "$repo/.git" -o -path "$link" -o -name node_modules \) -prune \
              -o -type d \( -name material -o -name 'Material_*' \) -prune -print0)
