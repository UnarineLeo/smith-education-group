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


## Deploy smitheducationgroup.co.za on cPanel

GitHub builds the Angular application; cPanel hosts the compiled site. The
`Build website for cPanel` workflow replaces the old Firebase deployment workflows.

### First deployment

1. The confirmed document root is `/home/smithed7g7f8/public_html`, configured in
   `deployment/cpanel/config.json`. If hosting changes, update this file or override
   it with the GitHub Actions repository variable `CPANEL_DOCUMENT_ROOT`.
   Do not add your cPanel password to the repository.
2. Push the source changes to the repository's default branch (`master`). The
   workflow installs dependencies with Node 22, builds the site, and publishes
   only compiled files plus `.htaccess` and `.cpanel.yml` to `cpanel-deploy`.
   Repository Actions permissions and branch rules must permit the workflow to
   write to this deployment branch.
3. In cPanel → Git Version Control, clone
   `https://github.com/UnarineLeo/smith-education-group.git` into a separate repository
   directory outside the website document root, for example
   `/home/smithed7g7f8/repositories/smith-education-group`. For a private repository,
   configure a read-only GitHub deploy key and use its SSH clone URL instead.
4. Manage that repository and select/check out **`cpanel-deploy`**, not `master`.
   Open **Pull or Deploy**, then click **Update from Remote** and **Deploy HEAD Commit**.
   The generated `.cpanel.yml` copies the compiled site into the configured document root.
5. In cPanel → Domains, verify `smitheducationgroup.co.za` uses that document root.
   Point its DNS to the cPanel hosting server using the hosting provider's records,
   and provision HTTPS through cPanel SSL/TLS Status / AutoSSL. GitHub Pages DNS
   records are not used for this hosting arrangement.

For later updates, push to `master`, wait for the GitHub workflow to pass, then
repeat **Update from Remote → Deploy HEAD Commit** in cPanel. GitHub builds and
updates the deployment branch automatically; cPanel's pull/deploy step is manual.
No Node.js server is needed on cPanel. Deployment preserves unrelated files in the
web root; old hashed build files can be cleaned up separately once a release is verified.
Back up an existing site before replacing its files, including `.htaccess`.

### Build and upload manually

Run `npm ci` and `npm run build:cpanel`. Upload the **contents** of `www/`, including
hidden `.htaccess`, into the domain's document root. The workflow also offers a
`cpanel-site` artifact containing these same files. Do not upload the source tree,
`node_modules`, or the `www` folder as an extra nesting level.

The cPanel build uses `/` as its base path and Apache's `.htaccess` routes page
requests to Angular, allowing URLs such as `/tabs/tutors` to refresh correctly.
The optional `npm run build:pages` build targets `/smith-education-group/` with hash
routing, but GitHub Pages is not the deployment target of this workflow.

If Firebase sign-in is used, add `smitheducationgroup.co.za` (and `www` if used) to
Firebase Authentication's authorized domains for the existing Firebase project.

References: [cPanel Git deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/)
and [cPanel Git Version Control](https://docs.cpanel.net/cpanel/files/git-version-control/).
