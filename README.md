Welcome to the Unipply repository! This project is dedicated to providing a seamless and efficient way to manage and apply for university programs. Our goal is to simplify the application process for students and educational institutions alike.

## Update university data automatically

Use the updater to refresh `openingDate`, `closingDate`, `application_fee`, `status`, and download brochures into `src/assets/brochures`.

### Run

```bash
npm run update:universities
```

### Optional: run for a specific date

```bash
TODAY=2026-08-01 npm run update:universities
```

This command reads `link`, `brochure_link`, and `webscrap_link` from `src/app/university-list/university-list.json`, then:

- Scrapes **undergraduate** date and fee clues from accessible pages
- Enforces opening/closing date pairs from the **same calendar year**
- Updates `status` based on current date (`Open`/`Closed`)
- Treats brochure as **prospectus** and prefers prospectus-like links
- Downloads only document brochures (`.pdf`, `.doc`, `.docx`)
- Saves local brochure path as `brochure_asset` when download succeeds

https://www.education.gov.za/Informationfor/Learners/SubjectChoiceandCareerPathing/tabid/980/Default.aspx

## Supabase private document uploads (backend option)

This project is configured to upload private documents through Supabase Edge Functions instead of direct browser uploads.

### Required secrets

Set these function secrets in your Supabase project:

```bash
npx supabase secrets set FIREBASE_PROJECT_ID=unipply-ae61a
npx supabase secrets set SUPABASE_STORAGE_BUCKET=unipply
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase automatically in functions.

### Deploy functions

```bash
npx supabase functions deploy document-upload
npx supabase functions deploy document-sign-url
```

### Apply storage policy script

```bash
npx supabase db query --linked --file scripts/supabase-storage-policies.sql
```

After deployment, client uploads call:

- `POST /functions/v1/document-upload`
- `POST /functions/v1/document-sign-url`

Both endpoints require a Firebase ID token in the `Authorization: Bearer <token>` header.
