# History Keyword Cleaner

[![CI, lint, and package](https://github.com/cpfaffinger/Firefox-History-Keyword-Cleaner/actions/workflows/ci.yml/badge.svg)](https://github.com/cpfaffinger/Firefox-History-Keyword-Cleaner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Ein privacy-first Firefox-Add-on, das Chronikeinträge automatisch löscht, sobald
deren URL oder Seitentitel eines der lokal definierten Keywords enthält.

Der feste Produkt- und Markenname lautet in allen Sprachen
**History Keyword Cleaner** und wird nicht übersetzt.

Stand dieser Dev-Version: **26. Juli 2026**. Sie zielt auf Firefox Desktop 140+
und Firefox für Android 142+; entwickelt und geprüft wird lokal mit **Firefox
153.0**.

## Funktionen

- wörtliche Keyword-Suche in URLs, dekodierten URLs und/oder Seitentiteln
- standardmäßig unabhängig von Groß-/Kleinschreibung
- sofortige Bereinigung über `history.onVisited` und `history.onTitleChanged`
- vollständige Bereinigung beim Firefox-Start und nach Regeländerungen
- Vorschau der Treffer, bevor bestehende Chronik gelöscht wird
- manueller „Wipe now“-Ablauf mit nicht blockierender In-App-Bestätigung
- Live-Phasen, Spinner, Fortschrittsbalken und Zähler für lange Vorgänge
- Import und Export der Einstellungen als JSON
- englische (Standard), deutsche, französische, italienische,
  niederländische und türkische Oberfläche
- keine Telemetrie, keine Konten, keine Netzwerkzugriffe und keine Werbung
- keine Host-Permissions und keine Content-Scripts

Keywords und Nutzungsstatistiken werden ausschließlich in
`browser.storage.local` gespeichert. `storage.sync` wird bewusst nicht benutzt.

## Lokal starten

Voraussetzungen: Node.js 22+, pnpm und eine aktuelle Firefox-Version.

```powershell
pnpm install
pnpm dev:local
```

Der lokale Befehl verwendet:

```text
C:\Program Files\Mozilla Firefox\firefox.exe
```

Alternativ plattformunabhängig:

```sh
pnpm dev
```

Firefox startet mit einem temporären Entwicklungsprofil. Eine manuelle
temporäre Installation ist über `about:debugging` → „Dieser Firefox“ →
„Temporäres Add-on laden“ möglich; dazu `src/manifest.json` auswählen.

## Prüfen und paketieren

```sh
pnpm test:coverage
pnpm lint
pnpm build
```

Oder alles zusammen:

```sh
pnpm verify
```

Das unsignierte AMO-Paket liegt danach unter `artifacts/`. Reguläre
Firefox-Versionen installieren dauerhaft nur von Mozilla signierte XPI-Dateien.

`pnpm lint:addons` führt Mozillas
[`addons-linter`](https://github.com/mozilla/addons-linter/) direkt gegen den
auszuliefernden Quellordner aus. Warnungen gelten dabei als Fehler.

## GitHub Actions und Release-Artefakte

Die Workflow-Datei [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
führt für Pull Requests und Pushes Tests, Sicherheitschecks, `web-ext`,
`addons-linter` und den Build aus.

- Jeder erfolgreiche Commit oder Merge auf `main` erzeugt ein dauerhaftes
  GitHub-Prerelease namens `main-<Commit-SHA>` mit dem geprüften, unsignierten
  ZIP als Download-Asset. Zusätzlich bleibt das Build 90 Tage als
  GitHub-Actions-Artefakt verfügbar.
- Ein Tag wie `v0.1.0` erzeugt ein normales, stabiles GitHub Release und hängt
  dasselbe geprüfte ZIP als Download-Asset an.

Ein Release-Tag sollte mit der Version in `package.json` und
`src/manifest.json` übereinstimmen:

```sh
git tag v0.1.0
git push origin v0.1.0
```

Das GitHub-ZIP ist ein überprüfbares, aber **unsigniertes** Entwicklerpaket.
Die dauerhafte Installation in regulärem Firefox erfordert weiterhin Mozillas
AMO-Signatur.

## Projektstruktur

```text
src/
  background.js          Firefox-Events, Nachrichten und Orchestrierung
  lib/                   getestete Match-, Einstellungs- und Scanlogik
  popup/                 schnelles Hinzufügen und manuelle Bereinigung
  options/               vollständige Einstellungen, Vorschau, Import/Export
  _locales/              Deutsch und Englisch
tests/                   Node-Unit- und Manifesttests
amo/                     Listing-Metadaten und Reviewer-Anleitung
docs/                    Produkt-, Release- und manuelle Testdokumentation
```

Der ausgelieferte Code in `src/` ist der lesbare Originalcode. Es gibt keine
Transpilation, Minifizierung, Obfuskation oder zur Laufzeit geladenen
Abhängigkeiten.

## Technische Entscheidungen

Das Add-on verwendet Manifest V3. Firefox 153 führt MV3-Hintergrundlogik
weiterhin als nicht persistente Event-Page über `background.scripts` aus;
`background.service_worker` wird von Firefox noch nicht unterstützt. Die
benötigten Berechtigungen sind:

- `history`: Chronik lesen und passende URLs löschen
- `storage`: Keywords, Optionen und aggregierte lokale Zähler speichern

Ein vollständiger History-Scan nutzt Zeitbereichsteilung, damit nicht nur die
von `history.search()` standardmäßig gelieferten 100 Einträge geprüft werden.
Gelöscht wird pro URL mit begrenzter Parallelität. Scan, Matching und Löschung
geben zwischen Arbeitsblöcken an Firefox zurück; dadurch bleibt die Oberfläche
auch bei großen Chroniken responsiv.

## Datenschutz und Sicherheit

Siehe [PRIVACY.md](PRIVACY.md) und [SECURITY.md](SECURITY.md). Das Manifest
deklariert die seit November 2025 für neue AMO-Erweiterungen erforderliche
Datensammlung korrekt als `required: ["none"]`.

## Veröffentlichung

Die vollständigen Schritte stehen in
[docs/AMO_RELEASE.md](docs/AMO_RELEASE.md). Für eine Veröffentlichung fehlen
bewusst nur kontogebundene Aktionen: ein AMO-Entwicklerkonto, dessen
API-Zugangsdaten, eine Support-/Security-Adresse und finale Listing-Screenshots.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
