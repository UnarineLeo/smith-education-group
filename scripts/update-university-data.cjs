#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../src/app/university-list/university-list.json');
const BROCHURE_DIR = path.resolve(__dirname, '../src/assets/brochures');
const TODAY = process.env.TODAY || new Date().toISOString().slice(0, 10);

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function parseIsoDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseHumanDate(candidate) {
  const cleaned = candidate.replace(/(st|nd|rd|th)/gi, '');

  const iso = cleaned.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }

  const dmy = cleaned.match(/\b(0?[1-9]|[12]\d|3[01])[\s/-](0?[1-9]|1[0-2])[\s/-](20\d{2})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }

  const monthFirst = cleaned.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(0?[1-9]|[12]\d|3[01])[,\s]+(20\d{2})\b/i
  );
  if (monthFirst) {
    const [, monthWord, d, y] = monthFirst;
    return new Date(Date.UTC(Number(y), MONTHS[monthWord.toLowerCase()], Number(d)));
  }

  const dayFirst = cleaned.match(
    /\b(0?[1-9]|[12]\d|3[01])\s+(january|february|march|april|may|june|july|august|september|october|november|december)[,\s]+(20\d{2})\b/i
  );
  if (dayFirst) {
    const [, d, monthWord, y] = dayFirst;
    return new Date(Date.UTC(Number(y), MONTHS[monthWord.toLowerCase()], Number(d)));
  }

  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDateCandidates(text) {
  const candidates = [];
  const regexes = [
    /\b20\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b/g,
    /\b(?:0?[1-9]|[12]\d|3[01])[\s/-](?:0?[1-9]|1[0-2])[\s/-]20\d{2}\b/g,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:0?[1-9]|[12]\d|3[01])[,\s]+20\d{2}\b/gi,
    /\b(?:0?[1-9]|[12]\d|3[01])\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)[,\s]+20\d{2}\b/gi,
  ];

  for (const regex of regexes) {
    const matches = text.match(regex);
    if (matches) candidates.push(...matches);
  }

  return Array.from(new Set(candidates));
}

function parseDateValues(values) {
  return values
    .map((value) => ({ value, date: parseHumanDate(value) }))
    .filter((item) => item.date && item.date.getUTCFullYear() >= 2024 && item.date.getUTCFullYear() <= 2030)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function pickSameYearWindow(parsedDates, preferredYear) {
  const byYear = new Map();

  for (const item of parsedDates) {
    const year = item.date.getUTCFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(item.date);
  }

  if (preferredYear && byYear.has(preferredYear) && byYear.get(preferredYear).length >= 2) {
    const group = byYear.get(preferredYear);
    return {
      openingDate: formatDate(group[0]),
      closingDate: formatDate(group[group.length - 1]),
    };
  }

  let selected = null;
  for (const [year, dates] of byYear.entries()) {
    if (dates.length < 2) continue;
    if (!selected) {
      selected = { year, dates };
      continue;
    }

    if (year > selected.year || (year === selected.year && dates.length > selected.dates.length)) {
      selected = { year, dates };
    }
  }

  if (!selected) return {};

  return {
    openingDate: formatDate(selected.dates[0]),
    closingDate: formatDate(selected.dates[selected.dates.length - 1]),
  };
}

function pickDates(text) {
  const candidates = parseDateValues(extractDateCandidates(text));

  if (candidates.length === 0) return {};

  const undergraduateContext =
    text.match(
      /(?:undergraduate|undergrad)[\s\S]{0,200}(?:application|applications|open|opening|close|closing|deadline|prospectus)[\s\S]{0,200}/gi
    ) || [];

  const undergradOpenContext =
    text.match(/(?:undergraduate|undergrad)[\s\S]{0,150}(?:open|opening|applications? open)[\s\S]{0,150}/gi) || [];
  const undergradCloseContext =
    text.match(/(?:undergraduate|undergrad)[\s\S]{0,150}(?:close|closing|applications? close|deadline)[\s\S]{0,150}/gi) || [];

  const openContext = text.match(/(?:open|opening|applications? open)[\s\S]{0,120}/gi) || [];
  const closeContext = text.match(/(?:close|closing|applications? close|deadline)[\s\S]{0,120}/gi) || [];

  const parsedUndergradDates = parseDateValues(
    undergraduateContext.flatMap((segment) => extractDateCandidates(segment))
  );

  const openingFromUndergradContext = undergradOpenContext
    .flatMap((segment) => extractDateCandidates(segment))
    .map((v) => parseHumanDate(v))
    .find(Boolean);

  const closingFromUndergradContext = undergradCloseContext
    .flatMap((segment) => extractDateCandidates(segment))
    .map((v) => parseHumanDate(v))
    .find(Boolean);

  if (
    openingFromUndergradContext &&
    closingFromUndergradContext &&
    openingFromUndergradContext.getTime() <= closingFromUndergradContext.getTime() &&
    openingFromUndergradContext.getUTCFullYear() === closingFromUndergradContext.getUTCFullYear()
  ) {
    return {
      openingDate: formatDate(openingFromUndergradContext),
      closingDate: formatDate(closingFromUndergradContext),
    };
  }

  if (parsedUndergradDates.length >= 2) {
    const preferredYear = openingFromUndergradContext?.getUTCFullYear() || closingFromUndergradContext?.getUTCFullYear();
    const dates = pickSameYearWindow(parsedUndergradDates, preferredYear);
    if (dates.openingDate && dates.closingDate) return dates;
  }

  const openingFromContext = openContext
    .flatMap((segment) => extractDateCandidates(segment))
    .map((v) => parseHumanDate(v))
    .find(Boolean);

  const closingFromContext = closeContext
    .flatMap((segment) => extractDateCandidates(segment))
    .map((v) => parseHumanDate(v))
    .find(Boolean);

  if (
    openingFromContext &&
    closingFromContext &&
    openingFromContext.getTime() <= closingFromContext.getTime() &&
    openingFromContext.getUTCFullYear() === closingFromContext.getUTCFullYear()
  ) {
    return {
      openingDate: formatDate(openingFromContext),
      closingDate: formatDate(closingFromContext),
    };
  }

  return pickSameYearWindow(candidates);
}

function isLikelyProspectusUrl(url) {
  return /prospectus|brochure|undergraduate|admissions?-booklet|programme-guide/i.test(url || '');
}

function isDocumentType(contentType, pathname) {
  return (
    contentType.includes('pdf') ||
    contentType.includes('msword') ||
    contentType.includes('officedocument.wordprocessingml') ||
    pathname.endsWith('.pdf') ||
    pathname.endsWith('.doc') ||
    pathname.endsWith('.docx')
  );
}

function isDocumentAssetPath(value) {
  return /\.pdf$|\.doc$|\.docx$/i.test(value || '');
}

function extractFee(text) {
  const feeRegexes = [
    /(?:application\s+fee|non[-\s]?refundable\s+fee|admin(?:istration)?\s+fee)[^\dR]{0,40}(?:R\s?|ZAR\s?)(\d{2,5})/i,
    /(?:R\s?|ZAR\s?)(\d{2,5})[^\n]{0,40}(?:application\s+fee|non[-\s]?refundable\s+fee|admin(?:istration)?\s+fee)/i,
  ];

  for (const regex of feeRegexes) {
    const match = text.match(regex);
    if (match) {
      const value = Number(match[1]);
      if (!Number.isNaN(value) && value >= 0 && value < 5000) return value;
    }
  }

  if (/\bno\s+application\s+fee\b/i.test(text) || /\bfree\s+application\b/i.test(text)) return 0;

  return null;
}

function resolveUrl(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractBrochureFromHtml(html, baseUrl) {
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const scored = [];

  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const label = stripHtml(match[2]).toLowerCase();
    const resolved = resolveUrl(baseUrl, href);
    if (!resolved) continue;

    let score = 0;
    if (/\.pdf(\?|$)/i.test(resolved)) score += 5;
    if (/prospectus|brochure|undergraduate/i.test(label)) score += 6;
    if (/prospectus|brochure|undergraduate/i.test(resolved)) score += 4;
    if (/programme|programmes|guide/i.test(label)) score += 1;
    if (/programme|programmes|guide/i.test(resolved)) score += 1;
    if (score > 0) scored.push({ url: resolved, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.url || null;
}

async function fetchWithTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadBrochure(url, uniId, uniName) {
  if (!isValidUrl(url)) return null;

  try {
    const response = await fetchWithTimeout(url, 20000);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    const directPath = new URL(response.url).pathname.toLowerCase();
    if (!isDocumentType(contentType, directPath)) return null;

    const ext =
      contentType.includes('pdf') || directPath.endsWith('.pdf')
        ? '.pdf'
        : contentType.includes('msword') || directPath.endsWith('.doc')
        ? '.doc'
        : '.docx';

    const fileName = `${String(uniId).padStart(2, '0')}-${slugify(uniName)}-brochure${ext}`;
    const outPath = path.join(BROCHURE_DIR, fileName);

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(outPath, Buffer.from(arrayBuffer));

    return `assets/brochures/${fileName}`;
  } catch {
    return null;
  }
}

function computeStatus(openingDate, closingDate, todayString) {
  const todayDate = parseIsoDate(todayString);
  const open = parseIsoDate(openingDate);
  const close = parseIsoDate(closingDate);

  if (!todayDate || !open || !close) return 'Closed';
  return todayDate >= open && todayDate <= close ? 'Open' : 'Closed';
}

async function updateUniversities() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Data file not found: ${DATA_PATH}`);
  }

  fs.mkdirSync(BROCHURE_DIR, { recursive: true });

  const universities = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  let updatedCount = 0;

  for (const uni of universities) {
    const candidateUrls = [uni.link, uni.brochure_link, uni.webscrap_link].filter(isValidUrl);

    let mergedText = '';
    let bestBrochure =
      isValidUrl(uni.brochure_link) && isLikelyProspectusUrl(uni.brochure_link) ? uni.brochure_link : null;

    for (const candidateUrl of candidateUrls) {
      try {
        const response = await fetchWithTimeout(candidateUrl);
        if (!response.ok) continue;

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('text/html')) {
          const html = await response.text();
          mergedText += ` ${stripHtml(html)}`;

          if (!bestBrochure || !/\.(pdf|docx?)(\?|$)/i.test(bestBrochure)) {
            const inferred = extractBrochureFromHtml(html, response.url || candidateUrl);
            if (inferred) bestBrochure = inferred;
          }
        }
      } catch {
        // ignore per-source failures and continue with the next source
      }
    }

    if (mergedText) {
      const dates = pickDates(mergedText);
      if (dates.openingDate) uni.openingDate = dates.openingDate;
      if (dates.closingDate) uni.closingDate = dates.closingDate;

      const fee = extractFee(mergedText);
      if (fee !== null) uni.application_fee = fee;
    }

    uni.status = computeStatus(uni.openingDate, uni.closingDate, TODAY);

    if (bestBrochure && isLikelyProspectusUrl(bestBrochure)) {
      uni.brochure_link = bestBrochure;
      const localAsset = await downloadBrochure(bestBrochure, uni.id, uni.name);
      if (localAsset) {
        uni.brochure_asset = localAsset;
      } else if (uni.brochure_asset && !isDocumentAssetPath(uni.brochure_asset)) {
        delete uni.brochure_asset;
      }
    } else if (uni.brochure_asset && !isDocumentAssetPath(uni.brochure_asset)) {
      delete uni.brochure_asset;
    }

    updatedCount += 1;
    console.log(`Updated ${uni.id}: ${uni.name}`);
  }

  fs.writeFileSync(DATA_PATH, `${JSON.stringify(universities, null, 2)}\n`);

  console.log(`\nDone. Updated ${updatedCount} universities.`);
  console.log(`Data file: ${DATA_PATH}`);
  console.log(`Brochures: ${BROCHURE_DIR}`);
  console.log(`Date used for status: ${TODAY}`);
}

updateUniversities().catch((error) => {
  console.error('Update failed:', error.message);
  process.exit(1);
});
