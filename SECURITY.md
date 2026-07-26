# Security

## Sicherheitsmodell

- keine Host-Permissions, Content-Scripts oder Webseiten-Manipulation
- keine Netzwerkzugriffe oder Remote-Code-Ausführung
- keine `eval`-/`Function`-Konstruktion und keine Inline-Skripte
- alle dynamischen Texte werden mit `textContent` gerendert
- Importdaten werden normalisiert und auf 500 Keywords à 256 Zeichen begrenzt
- begrenzte parallele Löschvorgänge verhindern unnötige Browserlast
- das ausgelieferte Paket enthält ausschließlich die Dateien unter `src/`

## Schwachstellen melden

Vor einer öffentlichen Veröffentlichung muss hier eine private
Security-Kontaktadresse ergänzt werden. Bitte keine sensiblen Browserdaten in
Fehlerberichten mitsenden.

## Unterstützte Versionen

Während der lokalen Entwicklung wird nur die jeweils neueste Version gepflegt.
Für einen Store-Release sollten Sicherheitskorrekturen stets als neue
Patch-Version veröffentlicht werden.
