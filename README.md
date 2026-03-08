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
