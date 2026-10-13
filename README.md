Welcome to the Smith Education Group repository! This project is dedicated to providing a seamless and efficient way to manage and apply for university programs. Our goal is to simplify the application process for students and educational institutions alike.

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


## Branding configuration

The app uses Smith Education Group branding with a provisional S monogram. Social links and old contact details have been removed. Add the confirmed website domain to SEO metadata and sitemap before deployment.

Firebase configuration in `src/environments/environment*.ts` retains the existing project identifiers to preserve authentication and data access. Migrating these requires a replacement Firebase project configuration.


## Wireframe pages

The public website uses a shared responsive page component in `src/app/education/`, with content in `education.data.ts`. Routes: `/tabs/home`, `/tabs/about-us`, `/tabs/services`, `/tabs/universities`, `/tabs/tutors`, `/tabs/success-stories`, `/tabs/resources`, `/tabs/contact-us`. The existing `/tabs/our-story`, `/home`, and `/contact` URLs remain supported.

Tutor profiles, company milestones, module availability, and student stories are explicitly provisional. Replace them with approved content before launch. The enquiry form validates and saves a draft in browser local storage; it does not send messages. Connect a delivery service and confirm the public contact details before enabling submission. No social links or account prompts are shown.

The study photograph is a locally stored Unsplash image (photo ID `1434030216411-0b793f4b4173`); campus photos reuse existing project assets.


## Visual design

The public pages share an blue and off-white palette (`#031d44`, `#3da5d9`, `#f8f7ff`), editorial headings, rounded cards, and responsive layouts. The homepage student image is stored locally at `src/assets/education/students.jpg` (Unsplash photo `1523240795612-9a054b0db644`). Header, footer, and page styles live alongside their Angular components.
