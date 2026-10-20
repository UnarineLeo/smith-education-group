import { packageSeo } from './package-seo.mjs';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

if (!existsSync('www/index.html')) throw new Error('Build the website before packaging it.');
packageSeo();
mkdirSync('www/api', { recursive: true });
copyFileSync('deployment/cpanel/contact.php', 'www/api/contact.php');
copyFileSync('deployment/cpanel/.htaccess', 'www/.htaccess');

const config = JSON.parse(readFileSync(new URL('../deployment/cpanel/config.json', import.meta.url), 'utf8'));
const documentRoot = process.env.CPANEL_DOCUMENT_ROOT || config.documentRoot;
if (documentRoot) {
  // A narrow path format prevents shell/YAML injection in the deployment task.
  if (!/^\/home\d*\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_./-]+$/.test(documentRoot)
      || documentRoot.split('/').some(part => part === '..' || part === '.')) {
    throw new Error('CPANEL_DOCUMENT_ROOT must be the absolute domain document root under /home/username/.');
  }
  const command = `/usr/bin/rsync -a --exclude=.git --exclude=.cpanel.yml ./ ${documentRoot.replace(/\/$/, '')}/`;
  writeFileSync('www/.cpanel.yml', `---\ndeployment:\n  tasks:\n    - ${JSON.stringify(command)}\n`);
}
console.log('cPanel package ready in www/' + (documentRoot ? ` for ${documentRoot}` : ' (manual upload; set CPANEL_DOCUMENT_ROOT to include Git deployment tasks).'));
