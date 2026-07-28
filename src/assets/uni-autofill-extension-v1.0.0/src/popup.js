(async () => {
  let profile = await loadProfile();
  let activeTab = "autofill";

  // ── Tab switching ──────────────────────────────────────────────────────────
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("panel-autofill").style.display = activeTab === "autofill" ? "" : "none";
      document.getElementById("panel-edit").style.display     = activeTab === "edit"     ? "" : "none";
      if (activeTab === "edit") renderEditForm();
    });
  });

  // ── Detect current tab ─────────────────────────────────────────────────────
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  // sendMessage with a hard 2s timeout — never gets stuck on "Checking…"
  function pingTab(tabId) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 2000);
      try {
        chrome.tabs.sendMessage(tabId, { action: "PING" }, (resp) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) { resolve(null); return; }
          resolve(resp || null);
        });
      } catch { clearTimeout(timer); resolve(null); }
    });
  }

  // ── Update status & show/hide sync banner ──────────────────────────────────
  async function updateStatus() {
    const tab = await getCurrentTab();
    const dot         = document.getElementById("status-dot");
    const title       = document.getElementById("status-title");
    const desc        = document.getElementById("status-desc");
    const autofillBtn = document.getElementById("btn-autofill");
    const syncBanner  = document.getElementById("sync-banner");
    const notLoggedIn = document.getElementById("not-logged-in");

    // Reset
    syncBanner.classList.remove("visible");
    notLoggedIn.classList.remove("visible");
    dot.className = "status-dot";
    title.textContent = "Checking…";
    desc.textContent = "";

    const isUnipply = tab?.url?.includes("unipply.co.za");

    if (isUnipply) {
      const resp = await pingTab(tab.id);
      if (!resp) {
        dot.className = "status-dot warn";
        title.textContent = "Page not ready";
        desc.textContent = "Reload the Unipply tab, then click ↻ here.";
      } else if (resp.loggedIn) {
        syncBanner.classList.add("visible");
        dot.className = "status-dot synced";
        title.textContent = "Unipply detected";
        desc.textContent = "Sync your profile with one click above.";
        autofillBtn.disabled = true;
      } else {
        notLoggedIn.classList.add("visible");
        dot.className = "status-dot warn";
        title.textContent = "Not logged in";
        desc.textContent = "Log in to Unipply first, then sync your profile.";
      }
      renderProfileSummary();
      return;
    }

    // Non-Unipply page — check if profile exists
    const hasProfile = Object.values(profile).some(
      (v) => v && typeof v === "string" && !v.startsWith("_")
    );
    if (!hasProfile) {
      dot.className = "status-dot warn";
      title.textContent = "No profile loaded";
      desc.textContent = "Visit Unipply while logged in and sync your profile.";
      autofillBtn.disabled = true;
      document.getElementById("empty-state").style.display = "";
      document.getElementById("profile-summary").style.display = "none";
      return;
    }

    // Ping content script on this (university) page
    const resp = await pingTab(tab.id);
    if (!resp || !resp.ok) {
      dot.className = "status-dot warn";
      title.textContent = "Can't reach page";
      desc.textContent = "Reload the university page and try again.";
      autofillBtn.disabled = true;
    } else {
      dot.className = "status-dot ready";
      title.textContent = "Ready to autofill";
      desc.textContent = "Profile loaded. Click below to fill the form.";
      autofillBtn.disabled = false;
    }

    renderProfileSummary();
  }

  // ── Profile summary card ───────────────────────────────────────────────────
  function renderProfileSummary() {
    const hasProfile = Object.values(profile).some(
      (v) => v && typeof v === "string" && !v.startsWith("_")
    );
    document.getElementById("empty-state").style.display = hasProfile ? "none" : "";
    document.getElementById("profile-summary").style.display = hasProfile ? "" : "none";
    if (!hasProfile) return;

    const badge = document.getElementById("sync-badge");
    if (profile._syncSource === "unipply" && profile._syncedAt) {
      badge.style.display = "";
      const d = new Date(profile._syncedAt);
      badge.title = `Synced ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } else {
      badge.style.display = "none";
    }

    const preview = PROFILE_FIELDS.slice(0, 6);
    document.getElementById("summary-rows").innerHTML = preview.map((f) => {
      const v = profile[f.key];
      return `<div class="profile-row">
        <span class="key">${escapeHtml(f.label)}</span>
        <span class="val${!v ? " empty" : ""}">${escapeHtml(v || "Not set")}</span>
      </div>`;
    }).join("");
  }

  await updateStatus();

  // ── Sync from Unipply ──────────────────────────────────────────────────────
  document.getElementById("btn-sync").addEventListener("click", async () => {
    const tab = await getCurrentTab();
    const btn = document.getElementById("btn-sync");
    btn.disabled = true;
    btn.textContent = "Syncing…";

    chrome.tabs.sendMessage(tab.id, { action: "SYNC_FROM_UNIPPLY" }, async (resp) => {
      btn.disabled = false;
      btn.textContent = "Sync profile from Unipply";

      if (chrome.runtime.lastError || !resp) {
        showToast("❌ Sync failed — reload the Unipply page and try again.");
        return;
      }
      if (resp.error === "NOT_LOGGED_IN") {
        showToast("⚠️ Please log in to Unipply first.");
        return;
      }

      profile = { ...profile, ...resp.profile };
      await saveProfile(profile);
      renderProfileSummary();
      showToast("✓ Profile synced from Unipply!");
      updateStatus();
    });
  });

  // ── Login link ─────────────────────────────────────────────────────────────
  document.getElementById("link-login").addEventListener("click", async (e) => {
    e.preventDefault();
    const tab = await getCurrentTab();
    chrome.tabs.update(tab.id, { url: "https://unipply.co.za/login" });
    window.close();
  });

  // ── Autofill ───────────────────────────────────────────────────────────────
  document.getElementById("btn-autofill").addEventListener("click", async () => {
    const tab = await getCurrentTab();
    chrome.tabs.sendMessage(tab.id, { action: "AUTOFILL", profile }, (resp) => {
      const pill = document.getElementById("result-pill");
      const txt  = document.getElementById("result-text");
      if (resp?.filled > 0) {
        txt.textContent = `${resp.filled} field${resp.filled !== 1 ? "s" : ""} filled`;
        pill.classList.add("show");
        showToast(`✓ ${resp.filled} fields filled!`);
      } else {
        txt.textContent = "No matching fields found";
        pill.classList.add("show");
        showToast("No matching fields found on this page.");
      }
    });
  });

  // ── Side panel ─────────────────────────────────────────────────────────────
  document.getElementById("btn-sidepanel").addEventListener("click", async () => {
    const tab = await getCurrentTab();
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });

  // ── Refresh ────────────────────────────────────────────────────────────────
  document.getElementById("btn-refresh").addEventListener("click", updateStatus);

  // ── Edit form ──────────────────────────────────────────────────────────────
  function renderEditForm() {
    let html = "";
    let lastGroup = null;
    for (const f of PROFILE_FIELDS) {
      if (f.group !== lastGroup) {
        html += `<div class="group-label">${GROUP_LABELS[f.group]}</div>`;
        lastGroup = f.group;
      }
      const val = escapeHtml(profile[f.key] || "");
      html += `<div class="field"><label>${escapeHtml(f.label)}</label>
        <input type="${escapeHtml(f.type)}" data-key="${escapeHtml(f.key)}" value="${val}" placeholder="${escapeHtml(f.label)}" /></div>`;
    }
    document.getElementById("edit-fields").innerHTML = html;
  }

  document.getElementById("btn-save").addEventListener("click", async () => {
    document.querySelectorAll("#edit-fields input").forEach((inp) => {
      profile[inp.dataset.key] = inp.value.trim();
    });
    await saveProfile(profile);
    showToast("Profile saved!");
    updateStatus();
  });

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  }
})();
