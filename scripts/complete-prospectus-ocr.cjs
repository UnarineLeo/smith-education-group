const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const stagingDirectory = process.argv[2];
if (!stagingDirectory) throw new Error('A staging directory is required');

function markdownText(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .map((line) => {
      const bullet = line.match(/^[•●▪◦]\s*(.+)$/);
      return bullet ? `- ${bullet[1]}` : line;
    })
    .join('\n')
    .trim();
}

const images = fs.readdirSync(stagingDirectory)
  .filter((name) => name.startsWith('.ocr-') && name.endsWith('.tiff'))
  .sort();

for (const imageName of images) {
  const match = imageName.match(/^\.ocr-(.+\.md)-(\d+)\.tiff$/);
  if (!match) throw new Error(`Unexpected OCR filename: ${imageName}`);
  const [, markdownName] = match;
  const imagePath = path.join(stagingDirectory, imageName);
  const text = execFileSync('/opt/homebrew/bin/tesseract', [
    imagePath,
    'stdout',
    '-l',
    'eng',
    '--psm',
    '6',
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const markdownPath = path.join(stagingDirectory, markdownName);
  const placeholder = `<!-- OCR_PENDING:${imageName} -->`;
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  if (!markdown.includes(placeholder)) throw new Error(`Missing placeholder for ${imageName}`);
  const replacement = text.trim().length >= 20
    ? markdownText(text)
    : '<!-- No extractable text on this page. -->';
  fs.writeFileSync(markdownPath, markdown.replace(placeholder, replacement));
  fs.unlinkSync(imagePath);
  process.stdout.write(`${imageName}\t${text.trim().length} OCR chars${text.trim().length < 20 ? ' (blank page)' : ''}\n`);
}

process.stdout.write(`Completed OCR for ${images.length} pages\n`);
