#!/bin/sh
# Baut die SVG-Lösungsabbildungen der Übungsseite (siehe Kopf von abbildungen.tex).
set -e
cd "$(dirname "$0")"
latex -interaction=nonstopmode abbildungen.tex >/dev/null
dvisvgm --no-fonts --page=1- --output="tmp-%p.svg" abbildungen.dvi 2>/dev/null
i=1
for n in klasse seq-add baum; do
  mv "tmp-$i.svg" "l-$n.svg"; i=$((i+1))
done
rm -f *.aux *.log *.dvi
ls -la *.svg
