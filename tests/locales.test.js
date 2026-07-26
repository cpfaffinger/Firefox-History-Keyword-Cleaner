import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const localeRoot = new URL("../src/_locales/", import.meta.url);
const expectedLocales = ["de", "en", "fr", "it", "nl", "tr"];
const brandName = "History Keyword Cleaner";

async function readMessages(locale) {
  return JSON.parse(
    await readFile(new URL(`${locale}/messages.json`, localeRoot), "utf8")
  );
}

test("ships exactly the supported Firefox locales", async () => {
  const directories = (
    await readdir(localeRoot, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(directories, expectedLocales);
});

test("every locale has the same complete key and placeholder contract", async () => {
  const english = await readMessages("en");
  const englishKeys = Object.keys(english).sort();

  for (const locale of expectedLocales) {
    const messages = await readMessages(locale);
    assert.deepEqual(
      Object.keys(messages).sort(),
      englishKeys,
      `${locale} must contain the same message keys as English`
    );

    for (const key of englishKeys) {
      assert.equal(
        typeof messages[key].message,
        "string",
        `${locale}.${key}.message must be a string`
      );
      assert.ok(
        messages[key].message.trim().length > 0,
        `${locale}.${key}.message must not be empty`
      );

      const expectedPlaceholders = english[key].placeholders ?? {};
      const actualPlaceholders = messages[key].placeholders ?? {};
      assert.deepEqual(
        Object.keys(actualPlaceholders).sort(),
        Object.keys(expectedPlaceholders).sort(),
        `${locale}.${key} must use the English placeholder names`
      );

      for (const placeholder of Object.keys(expectedPlaceholders)) {
        assert.equal(
          actualPlaceholders[placeholder].content,
          expectedPlaceholders[placeholder].content,
          `${locale}.${key}.${placeholder} must keep its argument position`
        );
        assert.ok(
          messages[key].message.includes(`$${placeholder.toUpperCase()}$`),
          `${locale}.${key} must include $${placeholder.toUpperCase()}$`
        );
      }
    }
  }
});

test("English remains the manifest fallback locale", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../src/manifest.json", import.meta.url), "utf8")
  );
  assert.equal(manifest.default_locale, "en");
});

test("the product brand is identical in every locale and UI fallback", async () => {
  for (const locale of expectedLocales) {
    const messages = await readMessages(locale);
    assert.equal(
      messages.extensionName.message,
      brandName,
      `${locale} must not translate or alter the product brand`
    );
  }

  for (const page of ["options/options.html", "popup/popup.html"]) {
    const html = await readFile(new URL(`../src/${page}`, import.meta.url), "utf8");
    assert.match(html, new RegExp(`<title>${brandName}</title>`));
    assert.match(
      html,
      new RegExp(`data-i18n="extensionName">${brandName}</h1>`)
    );
  }
});
