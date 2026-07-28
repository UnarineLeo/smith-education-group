# Unipply – Student Autofill Chrome Extension

Autofill university application forms from your student profile with one click — with a copy-paste side panel as a fallback.

---

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `uni-autofill-extension` folder
5. The Unipply icon appears in your toolbar

---

## How to use

### 1. Save your profile
- Click the Unipply icon → **Edit Profile** tab
- Fill in your personal, address, and academic details
- Click **Save Profile**

### 2. Autofill a form
- Navigate to any university application form
- Click the Unipply icon
- Click **Autofill this form**
- Fields that match your profile are filled and flash green

### 3. Manual copy-paste (Side Panel)
- Click **Open Side Panel** in the popup  
  *or* right-click the extension icon → "Open side panel"
- The side panel opens alongside the web page (split view)
- Browse all your profile fields by group or search
- Click **Copy** next to any field, then paste it into the form
- Use **Autofill active tab** from the side panel too

---

## Field matching

The autofill engine matches form inputs by scanning their `name`, `id`, `placeholder`, `aria-label`, and associated `<label>` text against patterns for each profile field. It works across most South African university portals (UCT, UP, Wits, SU, UJ, UKZN, NWU, etc.).

Fields detected:
- First name, Last name, Email, Phone, SA ID / Passport
- Date of birth, Gender, Nationality, Race, Disability status
- Street address, City, Province, Postal code
- School name, School province, Matric year, Interest
- University & course choices

---

## Privacy

All data is stored **locally** in `chrome.storage.local` on your device. Nothing is sent to any server.
