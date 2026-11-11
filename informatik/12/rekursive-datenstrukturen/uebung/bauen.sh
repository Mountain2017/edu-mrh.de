#!/bin/sh
# Baut die SVG-Abbildungen der Übungsseite und die Druckvorlage (siehe Kopf von abbildungen.tex).
set -e
cd "$(dirname "$0")"
namen="klasse seq-dauer seq-entfernen seq-einfuegen doppelt baum"
for art in a l; do
  quelle=abbildungen; [ "$art" = l ] && quelle=abbildungen-lsg
  latex -interaction=nonstopmode "$quelle.tex" >/dev/null
  dvisvgm --no-fonts --page=1- --output="tmp-%p.svg" "$quelle.dvi" 2>/dev/null
  i=1
  for n in $namen; do
    mv "tmp-$i.svg" "$art-$n.svg"; i=$((i+1))
  done
done
rm -f a-baum.svg l-seq-einfuegen.svg   # Baum nur als Lösung, Trittbrett nur als Angabe
pdflatex -interaction=nonstopmode abbildungen.tex >/dev/null
pdflatex -interaction=nonstopmode vorlagen.tex >/dev/null
pdflatex -interaction=nonstopmode vorlagen.tex >/dev/null
rm -f *.aux *.log *.dvi abbildungen.pdf abbildungen-lsg.pdf
ls -la *.svg *.pdf
