(async () => {
  // Always load fresh from storage on init
  let profile = await loadProfile();
  let activeGroup = "all";
  let searchQuery = "";

  // ── Check if active tab is Unipply ─────────────────────────────────────────
  async function checkUnipply() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const isUnipply = tab?.url?.includes("unipply.co.za");
      const syncStrip = document.getElementById("sync-strip");
      const warnStrip = document.getElementById("warn-strip");
      syncStrip.classList.remove("visible");
      warnStrip.classList.remove("visible");

      if (!isUnipply) return;

      // Timeout-safe ping
      const resp = await new Promise((resolve) => {
        const t = setTimeout(() => resolve(null), 2000);
        chrome.tabs.sendMessage(tab.id, { action: "PING" }, (r) => {
          clearTimeout(t);
          resolve(chrome.runtime.lastError ? null : r);
        });
      });

      if (!resp) return;
      if (resp.loggedIn) syncStrip.classList.add("visible");
      else warnStrip.classList.add("visible");
    } catch {}
  }

  // ── Profile identity bar ───────────────────────────────────────────────────
  function updateProfileBar() {
    const bar   = document.getElementById("profile-bar");
    const name  = document.getElementById("profile-bar-name");
    const meta  = document.getElementById("profile-bar-meta");
    const badge = document.getElementById("unipply-badge");
    const empty = document.getElementById("no-profile-msg");

    const hasAny = Object.entries(profile).some(
      ([k, v]) => !k.startsWith("_") && v && typeof v === "string"
    );

    if (!hasAny) {
      bar.style.display = "none";
      if (empty) empty.style.display = "";
      return;
    }

    if (empty) empty.style.display = "none";
    bar.style.display = "";
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    name.textContent  = fullName || "Student";
    meta.textContent  = profile.email || "";
    badge.style.display = profile._syncSource === "unipply" ? "" : "none";
  }

  // ── Sync from Unipply ──────────────────────────────────────────────────────
  document.getElementById("btn-sync").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const btn = document.getElementById("btn-sync");
    btn.disabled = true;
    btn.textContent = "Syncing…";

    // Show progress in the fields area
    document.getElementById("fields-list").innerHTML =
      `<div class="syncing-msg">⏳ Switching tabs on Unipply to collect all your data…</div>`;

    chrome.tabs.sendMessage(tab.id, { action: "SYNC_FROM_UNIPPLY" }, async (resp) => {
      btn.disabled = false;
      btn.textContent = "Sync";

      if (chrome.runtime.lastError || !resp) {
        showToast("❌ Sync failed. Reload Unipply and try again.");
        renderFields();
        return;
      }
      if (resp.error === "NOT_LOGGED_IN") {
        showToast("⚠️ Log in to Unipply first.");
        renderFields();
        return;
      }

      // Merge and persist
      profile = { ...profile, ...resp.profile };
      await saveProfile(profile);

      // Re-render everything with the new data
      updateProfileBar();
      renderFields();
      showToast("✓ Profile synced from Unipply!");
    });
  });

  // ── Render fields with big copy buttons ───────────────────────────────────
  function renderFields() {
    const list = document.getElementById("fields-list");

    const filtered = PROFILE_FIELDS.filter((f) => {
      if (activeGroup !== "all" && f.group !== activeGroup) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          f.label.toLowerCase().includes(q) ||
          (profile[f.key] || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (!filtered.length) {
      list.innerHTML = `<div class="no-results"><strong>No fields found</strong>Try a different search or group.</div>`;
      return;
    }

    // Check if we have any data at all
    const hasData = filtered.some((f) => profile[f.key]);

    if (!hasData) {
      list.innerHTML = `<div class="no-results">
        <strong>No data synced yet</strong>
        Select "Sync" above while on your Unipply profile page.
      </div>`;
      return;
    }

    list.innerHTML = filtered.map((f) => {
      const val = profile[f.key] || "";
      const safeVal = escapeHtml(val);
      return `
        <div class="field-card" id="card-${escapeHtml(f.key)}">
          <div class="field-info">
            <div class="field-label">${escapeHtml(f.label)}</div>
            <div class="field-value${!val ? " empty" : ""}">${escapeHtml(val || "Not set")}</div>
          </div>
          <button
            class="copy-btn${!val ? " disabled" : ""}"
            data-key="${escapeHtml(f.key)}"
            data-value="${safeVal}"
            ${!val ? "disabled" : ""}
            title="${val ? `Copy: ${safeVal}` : "No value"}"
          >${!val ? "—" : "Copy"}</button>
        </div>`;
    }).join("");

    // Attach copy handlers
    list.querySelectorAll(".copy-btn:not(.disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.value;
        if (!value) return;
        navigator.clipboard.writeText(value).then(() => {
          const original = btn.textContent;
          btn.textContent = "✓ Copied!";
          btn.classList.add("done");
          document.getElementById("card-" + btn.dataset.key)?.classList.add("copied");
          showToast(`Copied: ${value}`);
          setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove("done");
            document.getElementById("card-" + btn.dataset.key)?.classList.remove("copied");
          }, 2000);
        }).catch(() => {
          // Fallback for pages that block clipboard API
          const ta = document.createElement("textarea");
          ta.value = value;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showToast(`Copied: ${value}`);
        });
      });
    });
  }

  // ── Subjects section ───────────────────────────────────────────────────────
  function renderSubjects() {
    const section = document.getElementById("subjects-section");
    if (!section) return;
    const subjects = profile._subjects;
    if (!subjects || !subjects.length) { section.style.display = "none"; return; }
    section.style.display = "";
    section.innerHTML = `
      <div class="group-header">Subjects & Marks</div>
      ${subjects.map(s => `
        <div class="field-card subject-card">
          <div class="field-info">
            <div class="field-label">Subject</div>
            <div class="field-value">${escapeHtml(s.subject)}</div>
          </div>
          <div class="field-mark">
            <div class="field-label">Mark</div>
            <div class="field-value">${s.mark ? escapeHtml(s.mark) + "%" : "—"}</div>
          </div>
          <button class="copy-btn" data-value="${escapeHtml(s.subject)}" title="Copy subject name">Copy</button>
        </div>`).join("")}`;

    section.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.dataset.value).then(() => {
          btn.textContent = "✓";
          setTimeout(() => { btn.textContent = "Copy"; }, 1500);
        });
      });
    });
  }

  // ── Group tabs ─────────────────────────────────────────────────────────────
  document.getElementById("group-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".group-tab");
    if (!btn) return;
    activeGroup = btn.dataset.group;
    document.querySelectorAll(".group-tab").forEach((b) => b.classList.toggle("active", b === btn));
    renderFields();
  });

  // ── Search ─────────────────────────────────────────────────────────────────
  document.getElementById("search").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderFields();
  });

  // ── Autofill active tab ────────────────────────────────────────────────────
  document.getElementById("btn-autofill").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url?.includes("unipply.co.za")) {
      showToast("⚠️ Can't autofill Unipply itself — navigate to a university application form.");
      return;
    }
    chrome.tabs.sendMessage(tab.id, { action: "AUTOFILL", profile }, (resp) => {
      const result = document.getElementById("autofill-result");
      if (chrome.runtime.lastError) {
        showToast("Could not reach the page — please reload it first.");
      } else if (resp?.filled > 0) {
        result.textContent = `✓ ${resp.filled} filled`;
        result.classList.add("show");
        showToast(`${resp.filled} field${resp.filled !== 1 ? "s" : ""} autofilled!`);
      } else {
        result.textContent = "0 matched";
        result.classList.add("show");
        showToast("No matching fields found on this page.");
      }
      setTimeout(() => result.classList.remove("show"), 3000);
    });
  });

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  await checkUnipply();
  updateProfileBar();
  renderFields();
  renderSubjects();
})();
