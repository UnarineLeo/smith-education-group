// Unipply Student Autofill content script
(function () {
  "use strict";

  const IS_UNIPPLY = location.hostname.includes("unipply.co.za");

  // ── Firebase auth ─────────────────────────────────────────────────────────
  function getFirebaseUser() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("firebase:authUser")) {
          const user = JSON.parse(localStorage.getItem(key));
          if (user && user.uid) return user;
        }
      }
    } catch {}
    return null;
  }

  // ── UNIPPLY pages ─────────────────────────────────────────────────────────
  if (IS_UNIPPLY) {

    // Reads an input/select value by matching the <span> label text inside .field
    function valByExactLabel(labelText) {
      const allSpans = document.querySelectorAll("label.field > span, .field > span");
      for (const span of allSpans) {
        // Strip asterisk/required markers before comparing
        const spanText = span.childNodes[0]?.textContent?.trim() || span.textContent.trim();
        if (spanText.toLowerCase().includes(labelText.toLowerCase())) {
          const field = span.closest("label") || span.closest(".field");
          if (!field) continue;
          const el = field.querySelector("input:not([type=file]):not([type=button]), select");
          if (el && el.value && el.value.trim()) return el.value.trim();
        }
      }
      return "";
    }

    // Personal tab — profile.xxx fields
    function extractPersonal() {
      return {
        firstName:        valByExactLabel("First Name"),
        lastName:         valByExactLabel("Last Name"),
        initials:         valByExactLabel("Initials"),
        middleName:       valByExactLabel("Middle Name"),
        email:            valByExactLabel("Email Address"),
        phone:            valByExactLabel("Cellphone Number"),
        saIdNumber:       valByExactLabel("SA ID Number"),
        streetAddress:    valByExactLabel("Street Address"),
        cityTown:         valByExactLabel("City/Town"),
        provinceAddress:  valByExactLabel("Province"),
        postalCode:       valByExactLabel("Postal Code"),
        dateOfBirth:      valByExactLabel("Date of Birth"),
        gender:           valByExactLabel("Gender"),
        nationality:      valByExactLabel("Nationality"),
        race:             valByExactLabel("Race"),
        disabilityStatus: valByExactLabel("Disability Status"),
      };
    }

    // Academic tab — academicInformation.xxx fields
    function extractAcademic() {
      return {
        currentOrLastSchool: valByExactLabel("Current/Last School"),
        currentLevel:        valByExactLabel("Current Level"),
        schoolProvince:      valByExactLabel("School Province"),
        matricYear:          valByExactLabel("Matric Year"),
        hasWrittenNbt:       valByExactLabel("Have you written the NBT"),
        interest:            valByExactLabel("Interest"),
        universityChoice1:   valByExactLabel("University Choice 1"),
        universityChoice2:   valByExactLabel("University Choice 2"),
        universityChoice3:   valByExactLabel("University Choice 3"),
        universityChoice4:   valByExactLabel("University Choice 4"),
        courseChoice1:       valByExactLabel("Course Choice 1"),
        courseChoice2:       valByExactLabel("Course Choice 2"),
        courseChoice3:       valByExactLabel("Course Choice 3"),
        courseChoice4:       valByExactLabel("Course Choice 4"),
      };
    }

    // Subjects grid — .subject-row elements
    function extractSubjects() {
      const rows = document.querySelectorAll(".subject-row");
      const subjects = [];
      rows.forEach((row) => {
        const sel = row.querySelector("select");
        const num = row.querySelector("input[type=number]");
        if (sel && sel.value) subjects.push({ subject: sel.value, mark: num?.value || "" });
      });
      return subjects;
    }

    // Click a tab button by its visible text and wait for DOM to update
    function clickTab(labelText) {
      const btns = document.querySelectorAll(".tab-link, .tab-nav button, aside button");
      for (const btn of btns) {
        if (btn.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
          btn.click();
          return true;
        }
      }
      return false;
    }

    // Full sync: visit personal tab, scrape, then academic tab, scrape, then restore
    async function fullSync() {
      const fbUser = getFirebaseUser();
      if (!fbUser) return { error: "NOT_LOGGED_IN" };

      const profile = {};

      // 1. Personal tab
      clickTab("Personal Details");
      await new Promise(r => setTimeout(r, 500));
      Object.assign(profile, extractPersonal());

      // Fallback: fill email/name from Firebase auth if DOM didn't yield them
      if (!profile.email && fbUser.email) profile.email = fbUser.email;
      if (!profile.firstName && fbUser.displayName) {
        const parts = fbUser.displayName.trim().split(" ");
        profile.firstName = parts[0] || "";
        profile.lastName  = parts.slice(1).join(" ") || "";
      }

      // 2. Academic tab
      clickTab("Academic");
      await new Promise(r => setTimeout(r, 600));
      Object.assign(profile, extractAcademic());

      // 3. Subjects (same academic tab)
      const subjects = extractSubjects();
      if (subjects.length) profile._subjects = subjects;

      profile._syncedAt   = new Date().toISOString();
      profile._syncSource = "unipply";

      return { profile, fbUser: { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName } };
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.action === "PING") {
        const fbUser = getFirebaseUser();
        sendResponse({ ok: true, isUnipply: true, loggedIn: !!fbUser });
        return true;
      }

      if (msg.action === "SYNC_FROM_UNIPPLY") {
        fullSync().then(sendResponse);
        return true; // keep channel open for async
      }
    });

    return;
  }

  // ── NON-UNIPPLY: autofill university forms ────────────────────────────────

  const FIELD_MAP = {
    firstName:           [/first[\s_\-]?name/i, /fname/i, /given[\s_\-]?name/i, /forename/i, /^name$/i],
    lastName:            [/last[\s_\-]?name/i, /lname/i, /surname/i, /family[\s_\-]?name/i],
    initials:            [/initials?/i],
    middleName:          [/middle[\s_\-]?name/i, /additional[\s_\-]?name/i],
    email:               [/e[\s_\-]?mail/i],
    phone:               [/phone/i, /cell/i, /mobile/i, /contact[\s_\-]?number/i, /tel/i],
    saIdNumber:          [/id[\s_\-]?number/i, /national[\s_\-]?id/i, /sa[\s_\-]?id/i, /passport/i, /identity/i, /id[\s_\-]?no/i],
    streetAddress:       [/street/i, /address[\s_\-]?line[\s_\-]?1/i, /residential/i, /physical[\s_\-]?address/i],
    cityTown:            [/city/i, /town/i, /suburb/i, /locality/i],
    provinceAddress:     [/province/i, /state/i, /region/i],
    postalCode:          [/postal/i, /post[\s_\-]?code/i, /zip/i],
    dateOfBirth:         [/birth/i, /dob/i, /date[\s_\-]?of[\s_\-]?birth/i],
    gender:              [/gender/i, /sex(?!ual)/i],
    nationality:         [/nationality/i, /citizenship/i],
    race:                [/race/i, /ethnicity/i, /population[\s_\-]?group/i],
    disabilityStatus:    [/disab/i, /special[\s_\-]?needs/i],
    currentOrLastSchool: [/school/i, /high[\s_\-]?school/i, /secondary/i],
    matricYear:          [/matric[\s_\-]?year/i, /graduation[\s_\-]?year/i, /year[\s_\-]?completed/i],
    schoolProvince:      [/school[\s_\-]?province/i, /school[\s_\-]?region/i],
    interest:            [/interest/i, /field[\s_\-]?of[\s_\-]?study/i, /area[\s_\-]?of[\s_\-]?interest/i],
    courseChoice1:       [/course[\s_\-]?1/i, /programme[\s_\-]?1/i, /first[\s_\-]?choice[\s_\-]?course/i],
    courseChoice2:       [/course[\s_\-]?2/i, /programme[\s_\-]?2/i, /second[\s_\-]?choice[\s_\-]?course/i],
    universityChoice1:   [/university[\s_\-]?1/i, /institution[\s_\-]?1/i, /first[\s_\-]?choice[\s_\-]?uni/i],
    universityChoice2:   [/university[\s_\-]?2/i, /institution[\s_\-]?2/i, /second[\s_\-]?choice[\s_\-]?uni/i],
  };

  function getHaystack(el) {
    const attrs = [el.name, el.id, el.placeholder,
      el.getAttribute("aria-label"), el.getAttribute("data-name")]
      .filter(Boolean).join(" ");
    let label = "";
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) label = lbl.innerText || "";
    }
    if (!label) {
      const closest = el.closest("label") || el.closest(".field, .form-group, .form-field");
      if (closest) label = closest.innerText || "";
    }
    return `${attrs} ${label}`;
  }

  function getFieldKey(el) {
    const haystack = getHaystack(el);
    for (const [key, patterns] of Object.entries(FIELD_MAP)) {
      if (patterns.some((p) => p.test(haystack))) return key;
    }
    return null;
  }

  function fillField(el, value) {
    if (!value) return false;
    const tag = el.tagName.toLowerCase();

    if (tag === "select") {
      const opts = Array.from(el.options);
      const v = value.toLowerCase();
      const match = opts.find(o =>
        o.value.toLowerCase() === v ||
        o.text.toLowerCase() === v ||
        o.value.toLowerCase().includes(v) ||
        o.text.toLowerCase().includes(v)
      );
      if (!match) return false;
      el.value = match.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    // input / textarea — use native setter to trigger React/Angular/Vue bindings
    const proto = tag === "textarea"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value); else el.value = value;

    ["input", "change", "blur"].forEach(evt =>
      el.dispatchEvent(new Event(evt, { bubbles: true }))
    );
    return true;
  }

  function autofill(profile) {
    const inputs = Array.from(document.querySelectorAll(
      "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=file]):not([type=checkbox]):not([type=radio]), select, textarea"
    ));

    let filled = 0;
    const seen = new Set();

    for (const el of inputs) {
      if (el.readOnly || el.disabled) continue;
      const key = getFieldKey(el);
      if (!key || !profile[key] || seen.has(el)) continue;
      seen.add(el);
      if (fillField(el, profile[key])) {
        filled++;
        el.style.transition = "background 0.5s";
        el.style.background = "#d1fae5";
        setTimeout(() => { el.style.background = ""; }, 2000);
      }
    }
    return { filled };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "AUTOFILL") { sendResponse(autofill(msg.profile)); return true; }
    if (msg.action === "PING")     { sendResponse({ ok: true, isUnipply: false }); return true; }
  });

})();
