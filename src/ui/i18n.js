export function message(key, substitutions) {
  return browser.i18n.getMessage(key, substitutions) || key;
}

export function problemMessage(problem) {
  if (!problem) {
    return message("unexpectedError");
  }
  if (problem.code === "rawError") {
    return problem.args?.[0] || message("unexpectedError");
  }
  return message(problem.code, problem.args);
}

export function localizeDocument(root = document) {
  const uiLanguage = browser.i18n.getUILanguage?.();
  if (uiLanguage && root.documentElement) {
    root.documentElement.lang = uiLanguage;
  }

  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = message(element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute(
      "placeholder",
      message(element.dataset.i18nPlaceholder)
    );
  });

  root.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.setAttribute("title", message(element.dataset.i18nTitle));
  });
}
