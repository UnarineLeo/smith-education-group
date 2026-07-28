// shared.js – profile schema used by popup, sidepanel, and content script

const PROFILE_FIELDS = [
  // ── Personal Details (profile.xxx) ────────────────────────────────────────
  { key: "firstName",          label: "First Name",           group: "personal",  type: "text"  },
  { key: "middleName",         label: "Middle Name",           group: "personal",  type: "text"  },
  { key: "lastName",           label: "Last Name",            group: "personal",  type: "text"  },
  { key: "initials",           label: "Initials",              group: "personal",  type: "text"  },
  { key: "email",              label: "Email Address",        group: "personal",  type: "email" },
  { key: "phone",              label: "Cellphone Number",     group: "personal",  type: "tel"   },
  { key: "saIdNumber",         label: "SA ID / Passport No.", group: "personal",  type: "text"  },
  { key: "dateOfBirth",        label: "Date of Birth",        group: "personal",  type: "text"  },
  { key: "gender",             label: "Gender",               group: "personal",  type: "text"  },
  { key: "nationality",        label: "Nationality",          group: "personal",  type: "text"  },
  { key: "race",               label: "Race",                 group: "personal",  type: "text"  },
  { key: "disabilityStatus",   label: "Disability Status",    group: "personal",  type: "text"  },
  // ── Address (part of personal tab) ────────────────────────────────────────
  { key: "streetAddress",      label: "Street Address",       group: "address",   type: "text"  },
  { key: "cityTown",           label: "City / Town",          group: "address",   type: "text"  },
  { key: "provinceAddress",    label: "Province",             group: "address",   type: "text"  },
  { key: "postalCode",         label: "Postal Code",          group: "address",   type: "text"  },
  // ── Academic Info (academicInformation.xxx) ───────────────────────────────
  { key: "currentOrLastSchool",label: "Current / Last School",group: "academic",  type: "text"  },
  { key: "currentLevel",       label: "Current Level",        group: "academic",  type: "text"  },
  { key: "schoolProvince",     label: "School Province",      group: "academic",  type: "text"  },
  { key: "matricYear",         label: "Matric Year",          group: "academic",  type: "text"  },
  { key: "hasWrittenNbt",      label: "Written NBT?",         group: "academic",  type: "text"  },
  { key: "interest",           label: "Academic Interest",    group: "academic",  type: "text"  },
  { key: "universityChoice1",  label: "University Choice 1",  group: "academic",  type: "text"  },
  { key: "universityChoice2",  label: "University Choice 2",  group: "academic",  type: "text"  },
  { key: "universityChoice3",  label: "University Choice 3",  group: "academic",  type: "text"  },
  { key: "universityChoice4",  label: "University Choice 4",  group: "academic",  type: "text"  },
  { key: "courseChoice1",      label: "Course Choice 1",      group: "academic",  type: "text"  },
  { key: "courseChoice2",      label: "Course Choice 2",      group: "academic",  type: "text"  },
  { key: "courseChoice3",      label: "Course Choice 3",      group: "academic",  type: "text"  },
  { key: "courseChoice4",      label: "Course Choice 4",      group: "academic",  type: "text"  },
];

const GROUP_LABELS = {
  personal: "Personal Details",
  address:  "Address",
  academic: "Academic Info",
};

async function loadProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get("studentProfile", (data) => {
      resolve(data.studentProfile || {});
    });
  });
}

async function saveProfile(profile) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ studentProfile: profile }, resolve);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
