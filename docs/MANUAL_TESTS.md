# Manueller Testplan

Mozilla schreibt keine bestimmte Unit-Test-Quote vor. Reviewer führen jedoch
grundlegende Funktionstests aus und benötigen klare Testinformationen. Dieser
Plan ergänzt die automatisierten Tests.

## Vorbereitung

1. `pnpm verify` ausführen.
2. `pnpm dev:local` starten.
3. Im temporären Firefox-Profil die Add-on-Einstellungen öffnen.
4. Darauf achten, keine reale, erhaltenswerte Chronik für Löschtests zu nutzen.

## Kernfälle

1. Keyword `history-cleaner-test` eintragen, URL- und Titel-Matching aktivieren.
2. `https://example.com/history-cleaner-test` öffnen.
3. `about:history` öffnen und prüfen, dass die URL nicht vorhanden ist.
4. Eine lokale Testseite öffnen, deren URL nicht matcht, deren Titel aber
   `history-cleaner-test` enthält; prüfen, dass der Titel-Event den Eintrag
   löscht.
5. Automatik deaktivieren, passende Seite besuchen und prüfen, dass sie bleibt.
6. Automatik wieder aktivieren und „Bestehende Chronik bereinigen“ ausführen.
7. Groß-/Kleinschreibung mit `Secret` gegen `secret` in beiden Modi prüfen.
8. URL-kodiertes Keyword wie `private file` gegen `private%20file` prüfen.
9. Vorschau ausführen und sicherstellen, dass dabei kein Eintrag gelöscht wird.
10. Einstellungen exportieren, Keywords ändern und Export wieder importieren.
11. Firefox neu starten und die Startbereinigung prüfen.
12. „Jetzt löschen“ öffnen, den Dialog mit Escape abbrechen und prüfen, dass
    nichts gelöscht wird.
13. Wipe erneut bestätigen und beobachten, dass Scan-, Match- und Löschphase
    mit Spinner/Zählern erscheinen, ohne dass die Seite einfriert.

## UI und Barrierefreiheit

- Popup bei 100 % und 200 % Skalierung prüfen.
- Einstellungsseite bei 320 px, 768 px und Desktopbreite prüfen.
- Tastaturreihenfolge, sichtbare Fokusmarken und Space-Bedienung der Schalter
  prüfen.
- Hell- und Dunkelmodus prüfen.
- englische, deutsche, französische, italienische, niederländische und
  türkische Firefox-Sprache prüfen.

## Datenschutz

- Firefox-Netzwerkmonitor öffnen und bestätigen, dass das Add-on keine
  Requests sendet.
- Paketinhalt prüfen: keine Secrets, Quellkarten, Testdateien oder
  `node_modules`.
- `about:addons` prüfen: nur Chronik- und Speicherberechtigung.
