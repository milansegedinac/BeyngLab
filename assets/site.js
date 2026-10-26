(() => {
  "use strict";

  const dialog = document.querySelector(".search-dialog");
  const input = document.querySelector("#site-search");
  const results = document.querySelector("#search-results");
  const count = document.querySelector("#search-count");
  const menu = document.querySelector("#mobile-nav");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  let indexPromise;
  let latestRequest = 0;

  const normalize = (value) => String(value).toLocaleLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'");
  const words = (value) => normalize(value).match(/[a-z0-9]+(?:'[a-z0-9]+)*/g) || [];

  // Site root, derived from this script's own URL so the mirror works from any folder or file://
  const siteRoot = new URL("../", document.currentScript.src);
  const siteUrl = (url) => {
    if (!url.startsWith("/")) return url;
    const [, path, rest = ""] = url.match(/^\/([^#?]*)(.*)$/);
    const file = path === "" || path.endsWith("/") ? path + "index.html"
      : path.split("/").pop().includes(".") ? path : path + "/index.html";
    return new URL(file + rest, siteRoot).href;
  };

  function getIndex() {
    if (!indexPromise && window.BEYNGLAB_SEARCH_INDEX) {
      indexPromise = Promise.resolve(window.BEYNGLAB_SEARCH_INDEX);
    }
    if (!indexPromise) {
      indexPromise = fetch(siteUrl("/assets/search-index.json"))
        .then((response) => {
          if (!response.ok) throw new Error("Search index unavailable");
          return response.json();
        });
    }
    return indexPromise;
  }

  function score(record, query) {
    const terms = words(query);
    if (!terms.length) return 0;
    const title = normalize(record.title);
    const fields = [
      [words(record.title), 8],
      [words(record.keywords.join(" ")), 5],
      [words(record.description), 3],
      [words(record.text), 1],
    ];
    let total = 0;
    for (const term of terms) {
      const best = Math.max(...fields.map(([tokens, weight]) =>
        tokens.includes(term) ? weight :
          term.length >= 4 && tokens.some((token) => token.startsWith(term)) ? weight * 0.6 : 0));
      if (!best) return 0;
      total += best;
    }
    if (title.includes(normalize(query).trim())) total += 10;
    if (title === normalize(query).trim()) total += 5;
    if (record.url.includes("#")) total += 2;
    return total;
  }

  function renderGuide() {
    count.textContent = "Choose an entrance or search a term";
    results.replaceChildren();
    const guide = document.createElement("div");
    guide.className = "search-guide";
    const label = document.createElement("p");
    label.className = "serial";
    label.textContent = "Direct entrances";
    guide.append(label);
    const links = document.createElement("div");
    links.className = "search-guide-links";
    for (const [kind, title, url] of [
      ["Atlas", "Imaginal grammar", "/atlas/imaginal/"],
      ["Topoi", "Care", "/topoi/#care"],
      ["Sixfold", "Make a cosmogram", "/cosmograms/#make-cosmogram"],
      ["Hot House", "Wiseacre", "/hot-house/#doug-wise"],
      ["Pathway", "Corbin and the imaginal", "/paths/sufi-heidegger-after-corbin/#hinge"],
    ]) {
      const link = document.createElement("a");
      link.href = siteUrl(url);
      const small = document.createElement("span");
      small.textContent = kind;
      const strong = document.createElement("strong");
      strong.textContent = title;
      link.append(small, strong);
      links.append(link);
    }
    guide.append(links);
    const prompts = document.createElement("div");
    prompts.className = "search-prompts";
    const promptLabel = document.createElement("span");
    promptLabel.textContent = "Try a search";
    prompts.append(promptLabel);
    for (const term of ["world", "technology", "dwelling", "film"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = term;
      button.addEventListener("click", () => {
        input.value = term;
        input.focus();
        search(term);
      });
      prompts.append(button);
    }
    guide.append(prompts);
    results.append(guide);
  }

  function render(list, query) {
    results.replaceChildren();
    const matches = list.map((record) => ({ record, value: score(record, query) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value || a.record.title.localeCompare(b.record.title));
    count.textContent = query.trim()
      ? matches.length + " " + (matches.length === 1 ? "result" : "results") + " for this search"
      : "Explore the first release";
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = "No result yet. Try a shorter term, a thinker’s name, or a portal such as Atlas.";
      results.append(empty);
      return;
    }
    for (const item of matches) {
      const a = document.createElement("a");
      a.className = "search-result";
      a.href = siteUrl(item.record.url);
      const kind = document.createElement("span");
      kind.className = "result-kind";
      kind.textContent = item.record.type;
      const middle = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = item.record.title;
      const dek = document.createElement("small");
      dek.textContent = item.record.description;
      middle.append(title, dek);
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      a.append(kind, middle, arrow);
      results.append(a);
    }
  }

  async function search(query) {
    const request = ++latestRequest;
    if (!words(query).length) {
      renderGuide();
      return;
    }
    try {
      const data = await getIndex();
      if (request === latestRequest) render(data, query);
    } catch (_error) {
      count.textContent = "Search is unavailable";
      results.replaceChildren();
      const fallback = document.createElement("p");
      fallback.className = "search-empty";
      fallback.textContent = "Use the six entrances in the main navigation while the index is unavailable.";
      results.append(fallback);
    }
  }

  document.querySelectorAll("[data-open-search]").forEach((button) => {
    button.addEventListener("click", () => {
      if (menu && !menu.hidden) {
        menu.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
      }
      if (dialog && !dialog.open) dialog.showModal();
      input.focus();
      search(input.value);
    });
  });
  document.querySelectorAll("[data-close-search]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  if (dialog) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    results.addEventListener("click", (event) => {
      if (event.target.closest("a[href]")) dialog.close();
    });
  }
  input?.addEventListener("input", () => search(input.value));
  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    if (event.key === "/" && !dialog?.open && !["INPUT", "TEXTAREA"].includes(tag)) {
      event.preventDefault();
      dialog.showModal();
      input.focus();
      search(input.value);
    }
  });

  menuToggle?.addEventListener("click", () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    menuToggle.setAttribute("aria-expanded", String(opening));
  });

  // Look picker. The <head> of each page applies the saved look before first paint;
  // this builds the header control and keeps the choice in localStorage.
  const THEME_KEY = "beynglab-theme";
  const themes = [
    { id: "archive", name: "Archive", note: "The original: paper, ink, and rust.", colors: ["#f5f1e8", "#173c4b", "#9d4e39"], meta: "#173c4b" },
    { id: "nocturne", name: "Nocturne", note: "Dark and quiet, lit in amber.", colors: ["#11151c", "#ece4d4", "#e0a96d"], meta: "#11151c" },
    { id: "grid", name: "Grid", note: "Swiss modernist: black, white, signal red.", colors: ["#ffffff", "#111111", "#e2231a"], meta: "#111111" },
    { id: "riso", name: "Riso", note: "Zine print: blue ink, fluorescent pink.", colors: ["#f7f2e7", "#3255a4", "#ff48b0"], meta: "#3255a4" },
  ];
  const headerInner = document.querySelector(".header-inner");

  function applyTheme(id) {
    const theme = themes.find((item) => item.id === id) || themes[0];
    if (theme.id === "archive") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.meta);
    try { localStorage.setItem(THEME_KEY, theme.id); } catch (_error) { /* private mode: choice lasts this page only */ }
    document.querySelectorAll("[data-theme-choice]").forEach((option) => {
      option.setAttribute("aria-checked", String(option.dataset.themeChoice === theme.id));
    });
  }

  if (headerInner) {
    const picker = document.createElement("div");
    picker.className = "theme-picker";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "theme-trigger";
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "theme-menu");
    trigger.setAttribute("aria-label", "Choose a look");
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2"></circle>'
      + '<path class="fill" d="M12 3.8a8.2 8.2 0 0 1 0 16.4z"></path></svg><span>Look</span>';
    const panel = document.createElement("div");
    panel.className = "theme-menu";
    panel.id = "theme-menu";
    panel.hidden = true;
    panel.setAttribute("role", "radiogroup");
    panel.setAttribute("aria-label", "Look and feel");
    const label = document.createElement("span");
    label.className = "serial";
    label.textContent = "Choose a look";
    panel.append(label);
    for (const theme of themes) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "theme-option";
      option.dataset.themeChoice = theme.id;
      option.setAttribute("role", "radio");
      const swatch = document.createElement("span");
      swatch.className = "theme-swatch";
      swatch.setAttribute("aria-hidden", "true");
      for (const color of theme.colors) {
        const chip = document.createElement("i");
        chip.style.background = color;
        swatch.append(chip);
      }
      const text = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = theme.name;
      const note = document.createElement("small");
      note.textContent = theme.note;
      text.append(name, note);
      option.append(swatch, text);
      option.addEventListener("click", () => applyTheme(theme.id));
      panel.append(option);
    }
    picker.append(trigger, panel);
    headerInner.append(picker);

    const closePanel = () => {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };
    trigger.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      trigger.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) panel.querySelector('[aria-checked="true"]')?.focus();
    });
    document.addEventListener("click", (event) => {
      if (!panel.hidden && !picker.contains(event.target)) closePanel();
    });
    panel.addEventListener("keydown", (event) => {
      const options = Array.from(panel.querySelectorAll(".theme-option"));
      const index = options.indexOf(document.activeElement);
      if (event.key === "Escape") { closePanel(); trigger.focus(); }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        options[(index + step + options.length) % options.length].focus();
      }
    });
    applyTheme(document.documentElement.dataset.theme || "archive");
  }

  const worksheet = document.querySelector("#worksheet");
  document.querySelector("[data-download-notes]")?.addEventListener("click", () => {
    const data = new FormData(worksheet);
    const headings = {
      encounter: "Encounter",
      form: "Visible form and context",
      world: "Worlds it might open",
      withheld: "What is withheld or contested",
      revision: "Revised claim, danger, and counter-practice",
    };
    const body = ["BeyngLab / Ta’wil Portal", "Workshop trace", ""];
    for (const [field, label] of Object.entries(headings)) {
      body.push(label, String(data.get(field) || "").trim() || "[No note]", "");
    }
    body.push("This is a provisional reading. Keep objections with the claim.");
    const blob = new Blob([body.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BeyngLab-Tawil-Portal-notes.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.querySelector("#worksheet-status").textContent = "Notes downloaded to your device.";
  });

  const filmLab = document.querySelector("#film-lab-worksheet");
  document.querySelector("[data-download-film-notes]")?.addEventListener("click", () => {
    const data = new FormData(filmLab);
    const headings = {
      basis: "Evidence basis",
      scene: "Film copy and time mark",
      observation: "Observed shot and sound",
      imaginal: "Imaginal question and claim",
      pharmacological: "Pharmacological question and claim",
      objections: "Two objections and absent accounts",
      revision: "Revised claim and further evidence",
    };
    const lines = ["BeyngLab / Road, Voice, Death Film Lab", "Two-lens reading trace", ""];
    for (const [field, label] of Object.entries(headings)) {
      lines.push(label, String(data.get(field) || "").trim() || "[No note]", "");
    }
    lines.push("Keep what the film shows separate from sources and from BeyngLab's comparison. Preserve objections with the revised claim.");
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BeyngLab-Film-Lab-notes.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.querySelector("#film-lab-status").textContent = "Notes downloaded to your device.";
  });
  document.querySelector("[data-print-film]")?.addEventListener("click", () => window.print());

  const cosmogram = document.querySelector("#cosmogram-form");
  if (cosmogram) {
    const outputs = Array.from(cosmogram.querySelectorAll("[data-cosmo-output]"));
    const defaultText = new Map(outputs.map((element) => [element.dataset.cosmoOutput, element.textContent]));
    const fieldLabels = [
      ["epsFamily", "EPS / Family"],
      ["epsCommunity", "EPS / Community and history"],
      ["epsCulture", "EPS / Popular culture"],
      ["epsCareer", "EPS / School and career"],
      ["name", "The concrete thing"],
      ["earth", "Earth"],
      ["sky", "Sky"],
      ["mortals", "Mortals"],
      ["divinities", "Divinities / Other(s)"],
      ["thing", "Thing / Gathering"],
      ["world", "World(s) / Field"],
      ["stress", "Turn / Test / Return"],
    ];
    const status = document.querySelector("#cosmogram-status");

    function refreshCosmogram() {
      const notes = new FormData(cosmogram);
      for (const element of outputs) {
        const field = element.dataset.cosmoOutput;
        const value = String(notes.get(field) || "").trim();
        element.textContent = value || defaultText.get(field);
      }
      status.textContent = "";
    }

    cosmogram.addEventListener("input", refreshCosmogram);
    cosmogram.addEventListener("reset", () => setTimeout(refreshCosmogram, 0));
    document.querySelector("[data-download-cosmogram]")?.addEventListener("click", () => {
      const notes = new FormData(cosmogram);
      const lines = ["BeyngLab / Sixfold your fourfold", "A revisable cosmogram", ""];
      for (const [field, label] of fieldLabels) {
        lines.push(label, String(notes.get(field) || "").trim() || "[No note]", "");
      }
      lines.push("Ulmer's four scenes and Heidegger's fourfold are distinct methods. Thing and World cross the fourfold; they are not two further bins. Keep another reading and a material constraint in view.");
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "BeyngLab-Sixfold-cosmogram.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "Cosmogram downloaded to your device.";
    });
    document.querySelector("[data-print-cosmogram]")?.addEventListener("click", () => window.print());
  }
})();
