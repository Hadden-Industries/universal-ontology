/**
 * @file ontology.js
 * @description Modernized, consolidated processor and interactive table controller for OWL/XML Ontologies.
 * Features JSON-LD loading, dynamic table rendering, column filtering, multi-column sorting,
 * and data export utilities (CSV, JSON-LD, XMI).
 */
import { createOntologyViewModel } from "./ontologyViewModel.js";
import { sortOntologyRows } from "./ontologyTableSort.js";

/**
 * Wraps a value in an HTML anchor tag if it represents a valid URL or URN.
 * @param {string} value - The URI/URN value.
 * @param {boolean} [forceLink=false] - Whether to force a link even if it doesn't look like a standard URL.
 * @returns {string} The HTML link string, or escaped plain text if not a link.
 */
function createLink(value, forceLink = false) {
  if (!value) return "";

  if (
    forceLink ||
    value.toLowerCase().startsWith("urn:") ||
    value.startsWith("http:") ||
    value.startsWith("https:")
  ) {
    return `<a href="${escapeHTML(value)}" target="_blank" rel="noopener noreferrer">${escapeHTML(value)}</a>`;
  }
  return escapeHTML(value);
}

/**
 * Safely escapes a string for inclusion in HTML to prevent XSS.
 * @param {any} str - The input to escape.
 * @returns {string} The escaped HTML string.
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag] || tag,
  );
}

/**
 * Triggers a download of a materialized ontology asset.
 * @param {string} url - The URL of the materialized asset.
 */
function downloadMaterializedAsset(url) {
  if (!url) return;

  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Fetches and parses a JSON-LD ontology document.
 * @async
 * @param {string} url - The URL of the JSON-LD file to load.
 * @returns {Promise<Object>} The parsed JSON-LD document.
 */
async function fetchOntologyAsJsonLd(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/ld+json, application/json;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`JSON-LD fetch error! Status: ${response.status} (${url})`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON-LD document: ${url}`, {
      cause: error,
    });
  }
}

/**
 * Encapsulated UI Controller class managing table rendering, dropdown actions, sorting, and export logic.
 */
export class OntologyUIController {
  #extractedData = [];
  #currentSortCol = null;
  #currentSortAsc = true;
  #hiddenColumns = new Set();
  #jsonLdDoc = null;
  #csvUrl = null;
  #jsonLdUrl = null;
  #xmiUrl = null;
  #sourceUrl = null;
  #colStyleElement = null;
  #webMcpRegistrationController = null;

  constructor() {
    this.#colStyleElement = document.createElement("style");
    document.head.appendChild(this.#colStyleElement);
  }

  /**
   * Initializes the UI event handlers and starts initial ontology load.
   * @async
   */
  async init() {
    this.#setupSortListeners();
    this.#setupColumnDropdown();
    this.#setupExportDropdown();
    await this.#loadAndRender();
  }

  /**
   * Dynamically updates CSS rules to show/hide table columns.
   * @private
   */
  #updateColumnVisibility() {
    let cssText = "";
    this.#hiddenColumns.forEach((index) => {
      // CSS :nth-child is 1-based
      cssText += `table th:nth-child(${index + 1}), table td:nth-child(${index + 1}) { display: none !important; }\n`;
    });
    this.#colStyleElement.textContent = cssText;
  }

  /**
   * Builds and configures column filtering dropdown menu.
   * @private
   */
  #setupColumnDropdown() {
    const headers = document.querySelectorAll("thead th");
    const menu = document.getElementById("col-menu");
    const toggleBtn = document.getElementById("col-toggle");
    const exportMenu = document.getElementById("export-menu");

    if (!menu || !toggleBtn) return;

    headers.forEach((th, index) => {
      const text = th.childNodes[0].textContent.trim();
      const label = document.createElement("label");
      label.className = "dropdown-item";
      label.title = text;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.#hiddenColumns.delete(index);
        } else {
          this.#hiddenColumns.add(index);
        }
        this.#updateColumnVisibility();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(text));
      menu.appendChild(label);
    });

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("show");
      if (exportMenu) exportMenu.classList.remove("show");
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== toggleBtn) {
        menu.classList.remove("show");
      }
    });
  }

  /**
   * Configures listeners for data export buttons (CSV, JSON-LD, XMI).
   * @private
   */
  #setupExportDropdown() {
    const exportMenu = document.getElementById("export-menu");
    const toggleExportBtn = document.getElementById("export-toggle");
    const colMenu = document.getElementById("col-menu");

    if (!exportMenu || !toggleExportBtn) return;

    toggleExportBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle("show");
      if (colMenu) colMenu.classList.remove("show");
    });

    document.addEventListener("click", (e) => {
      if (!exportMenu.contains(e.target) && e.target !== toggleExportBtn) {
        exportMenu.classList.remove("show");
      }
    });

    const exportCsvBtn = document.getElementById("export-csv");
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        exportCsvBtn.disabled = true;
        exportCsvBtn.classList.add("exporting");
        try {
          downloadMaterializedAsset(this.#csvUrl);
        } finally {
          exportCsvBtn.classList.remove("exporting");
          exportCsvBtn.disabled = false;
        }
      });
    }

    const exportJsonLdBtn = document.getElementById("export-jsonld");
    if (exportJsonLdBtn) {
      exportJsonLdBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        exportJsonLdBtn.disabled = true;
        exportJsonLdBtn.classList.add("exporting");
        try {
          downloadMaterializedAsset(this.#jsonLdUrl);
        } finally {
          exportJsonLdBtn.classList.remove("exporting");
          exportJsonLdBtn.disabled = false;
        }
      });
    }

    const exportXmiBtn = document.getElementById("export-xmi");
    if (exportXmiBtn) {
      const status = document.getElementById("xmi-export-status");
      const description = document.getElementById("xmi-export-description");
      try {
        const declarations = JSON.parse(
          document.getElementById("ontology-xmi-exports")?.textContent ??
            "null",
        );
        const pagePath = new URL(window.location.href).pathname.replace(
          /\.html$/u,
          "",
        );
        const binding =
          declarations?.schemaVersion === 1 &&
          Array.isArray(declarations.exports)
            ? declarations.exports.find(
                (item) =>
                  item.scope === "full" &&
                  [item.source, item.full].includes(pagePath),
              )
            : null;
        if (binding) {
          const target = new URL(binding.href, window.location.href);
          if (
            target.origin === window.location.origin &&
            target.pathname.endsWith("-full.xmi")
          )
            this.#xmiUrl = target.href;
        }
      } catch (error) {
        console.error("Invalid XMI download declaration:", error);
      }
      exportXmiBtn.disabled = !this.#xmiUrl;
      if (this.#xmiUrl) {
        exportXmiBtn.title = "Download full-ontology UML XMI";
        if (description)
          description.textContent = "Full ontology, including imports";
      }
      exportXmiBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!this.#xmiUrl) return;
        exportXmiBtn.disabled = true;
        exportXmiBtn.classList.add("exporting");
        exportXmiBtn.setAttribute("aria-busy", "true");
        try {
          // A HEAD check reports unavailable artifacts without fetching a large
          // XMI into browser memory before its normal materialized download.
          const response = await fetch(this.#xmiUrl, { method: "HEAD" });
          if (!response.ok)
            throw new Error(`XMI download unavailable (${response.status})`);
          if (status) status.textContent = "";
          downloadMaterializedAsset(this.#xmiUrl);
        } catch (error) {
          console.error("XMI Export failed:", error);
          if (status) status.textContent = "Download failed. Try again.";
        } finally {
          exportXmiBtn.classList.remove("exporting");
          exportXmiBtn.removeAttribute("aria-busy");
          exportXmiBtn.disabled = !this.#xmiUrl;
        }
      });
    }
  }

  /**
   * Binds sort click handlers to header columns with data-sort attributes.
   * @private
   */
  #setupSortListeners() {
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.innerHTML += ' <span class="sort-icon">&#9650;&#9660;</span>';
      th.addEventListener("click", () =>
        this.#handleSort(th.getAttribute("data-sort")),
      );
    });
  }

  /**
   * Reorders data and updates active header indicators.
   * @private
   * @param {string} column - Sort column name.
   */
  #handleSort(column) {
    if (this.#currentSortCol === column) {
      this.#currentSortAsc = !this.#currentSortAsc;
    } else {
      this.#currentSortCol = column;
      this.#currentSortAsc = true;
    }

    document.querySelectorAll("th[data-sort]").forEach((th) => {
      const icon = th.querySelector(".sort-icon");
      if (icon) {
        if (th.getAttribute("data-sort") === column) {
          icon.innerHTML = this.#currentSortAsc ? "&#9650;" : "&#9660;";
          icon.classList.add("active");
        } else {
          icon.innerHTML = "&#9650;&#9660;";
          icon.classList.remove("active");
        }
      }
    });

    sortOntologyRows(this.#extractedData, column, this.#currentSortAsc);

    this.#renderTable();
  }

  /**
   * Renders extracted ontology nodes into table rows using DocumentFragment.
   * @private
   */
  #renderTable() {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    const fragment = document.createDocumentFragment();

    this.#extractedData.forEach((row) => {
      const tr = document.createElement("tr");

      const superclassesHtml = row.superclasses
        .map((uri) => createLink(uri))
        .join("<br>");

      tr.innerHTML = `
      <td><span class="badge">${escapeHTML(row.entityType)}</span></td>
      <td><span class="code-text">${escapeHTML(row.uuid)}</span></td>
      <td><span class="code-text">${createLink(row.uri, true)}</span></td>
      <td style="font-weight: 500;">${escapeHTML(row.preferredLabel)}</td>
      <td class="wrap-text">${escapeHTML(row.definition)}</td>
      <td><span class="code-text">${row.sources
        .map((source) => createLink(source))
        .join("<br>")}</span></td>
      <td><span class="code-text">${row.references
        .map((reference) => createLink(reference))
        .join("<br>")}</span></td>
      <td><span class="code-text">${createLink(row.creator, true)}</span></td>
      <td>${escapeHTML(row.createdAt).replace("T", "<wbr>T")}</td>
      <td>${escapeHTML(row.modifiedAt).replace("T", "<wbr>T")}</td>
      <td class="wrap-text"><span class="code-text">${superclassesHtml}</span></td>
      <td><span class="code-text">${createLink(
        row.classOfNamedIndividual,
        true,
      )}</span></td>
    `;

      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
  }

  /**
   * Registers optional browser-agent functionality after the human-facing
   * ontology view is complete. Unsupported browsers return before importing
   * any WebMCP code, preserving this feature as true progressive enhancement.
   *
   * @param {ReturnType<typeof import("./ontologyViewModel.js").createOntologyViewModel>["ontology"]} ontologyDocumentMetadata
   * @returns {Promise<void>}
   */
  async #registerOntologyEntityDefinitionTool(ontologyDocumentMetadata) {
    let modelContext;

    try {
      modelContext = document.modelContext;
    } catch (error) {
      console.error(
        "WebMCP ontology definition tool registration failed:",
        error,
      );
      return;
    }

    if (typeof modelContext?.registerTool !== "function") {
      return;
    }

    const registrationController = new AbortController();
    this.#webMcpRegistrationController = registrationController;
    const handlePageHide = (event) => {
      // A persisted pagehide suspends the document in the back/forward cache;
      // its contextual tool remains valid when that same document resumes.
      if (!event.persisted) {
        registrationController.abort();
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    registrationController.signal.addEventListener(
      "abort",
      () => {
        window.removeEventListener("pagehide", handlePageHide);

        if (this.#webMcpRegistrationController === registrationController) {
          this.#webMcpRegistrationController = null;
        }
      },
      { once: true },
    );

    try {
      const { registerDisplayedOntologyEntityDefinitionTool } =
        await import("./webmcp/registerDisplayedOntologyEntityDefinitionTool.js");
      const registered = await registerDisplayedOntologyEntityDefinitionTool({
        modelContext,
        ontologyDocumentMetadata,
        ontologyDocumentIri: this.#sourceUrl,
        ontologyPageRootIri: new URL("/ontology/", window.location.origin).href,
        ontologyQueryRootIri: new URL(
          "/ontology/query/v1/",
          window.location.origin,
        ).href,
        registrationSignal: registrationController.signal,
        fetchImplementation: fetch,
        reportUnhandledError(error) {
          console.error(
            "WebMCP ontology definition tool execution failed:",
            error,
          );
        },
      });

      if (!registered) {
        // An expected out-of-scope page variant has no registration to retain.
        registrationController.abort();
      }
    } catch (error) {
      if (registrationController.signal.aborted) {
        return;
      }

      registrationController.abort();
      console.error(
        "WebMCP ontology definition tool registration failed:",
        error,
      );
    }
  }

  /**
   * Asynchronously loads XML data, constructs JSON-LD document, and renders UI.
   * @private
   */
  async #loadAndRender() {
    const pageUrl = new URL(window.location.href);
    const pathname = pageUrl.pathname;
    const lastSlashIndex = pathname.lastIndexOf("/");
    const lastDotIndex = pathname.lastIndexOf(".");

    const sourcePath =
      lastDotIndex > lastSlashIndex
        ? pathname.substring(0, lastDotIndex)
        : pathname;

    const sourceUrl = new URL(pageUrl);
    sourceUrl.pathname = sourcePath;
    sourceUrl.search = "";
    sourceUrl.hash = "";

    const jsonLdUrl = new URL(sourceUrl);
    jsonLdUrl.pathname = `${sourcePath}.jsonld`;

    const csvUrl = new URL(sourceUrl);
    csvUrl.pathname = `${sourcePath}.csv`;

    this.#sourceUrl = sourceUrl.href;
    this.#csvUrl = csvUrl.href;
    this.#jsonLdUrl = jsonLdUrl.href;

    try {
      this.#jsonLdDoc = await fetchOntologyAsJsonLd(this.#jsonLdUrl);

      const viewModel = createOntologyViewModel(this.#jsonLdDoc, {
        ontologyPath: sourcePath,
      });

      this.#extractedData = viewModel.rows;

      if (viewModel.ontology.ontologyTitle) {
        document.title = viewModel.ontology.ontologyTitle;
      }

      this.#renderTable();
      await this.#registerOntologyEntityDefinitionTool(viewModel.ontology);
    } catch (error) {
      console.error("Error processing ontology file:", error);
    }
  }
}

// Auto-initialize UI controller when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const controller = new OntologyUIController();
      controller.init();
    });
  } else {
    const controller = new OntologyUIController();
    controller.init();
  }
}
