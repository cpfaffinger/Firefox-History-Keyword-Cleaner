# Veröffentlichung auf addons.mozilla.org (AMO)

Stand: 26. Juli 2026.

## Bereits erfüllt

- Manifest V3 mit expliziter Entwicklungs-ID
- `strict_min_version` 140 (Desktop) und 142 (Android)
- vorgeschriebene `data_collection_permissions.required: ["none"]`
- nur notwendige Berechtigungen (`history`, `storage`)
- keine Host-Permissions, Remote-Skripte, Telemetrie oder Obfuskation
- lesbarer Originalcode entspricht direkt dem Paketinhalt
- vollständige EN-, DE-, FR-, IT-, NL- und TR-Lokalisierung
- Unit-, Manifest- und statische Sicherheitstests
- `web-ext lint --warnings-as-errors`
- reproduzierbarer Build mit festgeschriebener `web-ext`-Version
- Reviewer-Anleitung und Listing-Entwurf
- Datenschutz- und Sicherheitsdokumentation

## Vor der ersten öffentlichen Einreichung

1. die endgültige Add-on-ID bestätigen; der Produktname
   **History Keyword Cleaner** ist festgelegt und wird nicht lokalisiert;
2. verantwortliche Support- und Security-Adresse in den Dokumenten und
   AMO-Metadaten ergänzen;
3. finale Screenshots aus Firefox erstellen und im AMO-Listing hochladen;
4. AMO-Entwicklerkonto erstellen und die Developer Agreement akzeptieren;
5. die manuellen Tests in `docs/MANUAL_TESTS.md` in einem frischen Profil
   vollständig ausführen;
6. Versionsnummer in `package.json`, `src/manifest.json` und `CHANGELOG.md`
   gemeinsam aktualisieren;
7. `pnpm install --frozen-lockfile && pnpm verify` ausführen;
8. den Inhalt von `artifacts/*.zip` prüfen.

## Einreichen

API-Zugangsdaten im AMO Developer Hub erstellen und nur als Umgebungsvariablen
setzen:

```sh
web-ext sign \
  --source-dir src \
  --channel listed \
  --amo-metadata amo/metadata.json \
  --api-key "$AMO_JWT_ISSUER" \
  --api-secret "$AMO_JWT_SECRET"
```

Alternativ kann das von `pnpm build` erstellte ZIP über den AMO Developer Hub
hochgeladen werden. Secrets dürfen nie in Dateien oder Git eingecheckt werden.

## Was Mozilla tatsächlich verlangt

Mozilla gibt keine Mindestquote für Unit-Test-Coverage vor. Gefordert werden
funktionierender, überprüfbarer Code, grundlegende funktionale Testbarkeit,
Reviewer-Testinformationen, nur notwendige Berechtigungen, kein Remote-Code
und eine korrekte Datensammlungsdeklaration. Eine Privacy Policy ist bei
Datenübertragung zwingend; dieses Add-on überträgt nichts, liefert dennoch eine
transparente Policy.

Falls Code minifiziert, transpiliert oder anderweitig generiert würde, müsste
zusätzlich der menschenlesbare Quellcode samt reproduzierbarer Build-Anleitung
eingereicht werden. Version 0.1.0 benötigt das nicht: `src/` ist bereits der
unveränderte, ausgelieferte Quellcode.

## Relevante Mozilla-Quellen

- [Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Getting started with web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [web-ext command reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
- [Manifest `browser_specific_settings`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)
