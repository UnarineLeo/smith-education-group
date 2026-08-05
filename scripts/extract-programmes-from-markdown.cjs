const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const markdownDirectory = path.join(root, 'src/assets/markdown');
const outputPath = path.join(root, 'src/app/shared/programme-list.json');
const baselinePath = path.join(root, 'src/assets/programme-list.json');
const universityPath = path.join(root, 'src/app/university-list/university-list.json');

const universities = JSON.parse(fs.readFileSync(universityPath, 'utf8'));
// Refresh the current generated list when it exists. The smaller asset file is
// retained only as a bootstrap fallback; using it as the primary source would
// discard universities recovered from later prospectus conversions.
const existingPath = fs.existsSync(outputPath) ? outputPath : baselinePath;
const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
const universityBySlug = new Map(
  universities.map((university) => [
    path.basename(university.brochure_asset ?? '', '_prospectus.pdf').replace('_prospectus', ''),
    university
  ])
);

// The brochure filename is the stable join key used by both the markdown and
// university data. A few asset paths contain typos, so explicitly cover them.
for (const university of universities) {
  const match = (university.brochure_asset ?? '').match(/\/([^/]+)_prospectus\.*pdf$/i);
  if (match) universityBySlug.set(match[1].toLowerCase(), university);
}

const universityByName = new Map(universities.map((university) => [university.name, university]));
for (const programme of existing) {
  const university = universityByName.get(programme.universityName);
  if (university) programme.universityId = university.id;
}
const existingUniversityIds = new Set(existing.map((programme) => programme.universityId));
const subjectNames = [
  'English Home Language',
  'English First Additional Language',
  'English',
  'Mathematical Literacy',
  'Technical Mathematics',
  'Mathematics',
  'Physical Sciences',
  'Physical Science',
  'Life Sciences',
  'Life Science',
  'Accounting',
  'Agricultural Sciences',
  'Agricultural Science',
  'Geography',
  'Afrikaans',
  'Information Technology'
];

function clean(value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<sup>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_`#]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normaliseFaculty(value) {
  return clean(value)
    .replace(/^.*?\bFACULTY OF\s+/i, '')
    .replace(/\s+(?:TEL|TELEPHONE|CLOSING DATE|PROGRAMMES?).*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function facultyAt(lines, rowIndex) {
  for (let index = rowIndex; index >= Math.max(0, rowIndex - 180); index -= 1) {
    const line = clean(lines[index]);
    const match = line.match(/\bFACULTY OF\s+(.+)/i);
    if (!match) continue;
    const faculty = normaliseFaculty(match[0]);
    if (/engineering|built environment/i.test(faculty)) return 'Engineering & Built Environment';
    if (/health|medicine|pharmacy|dental|nursing/i.test(faculty)) return 'Health Sciences';
    if (/commerce|management|economic|business|account/i.test(faculty)) return 'Commerce & Management';
    if (/science|agriculture|natural/i.test(faculty)) return 'Science & IT';
    if (/education/i.test(faculty)) return 'Education';
    if (/\blaw\b/i.test(faculty)) return 'Law';
    if (/humanities|arts|social/i.test(faculty)) return 'Humanities';
  }
  return 'Not specified';
}

function qualificationType(name) {
  if (/^Higher Certificate\b/i.test(name)) return 'Higher Certificate';
  if (/^Advanced Diploma\b/i.test(name)) return 'Advanced Diploma';
  if (/^Diploma\b/i.test(name)) return 'Diploma';
  if (/^(?:MBChB|Bachelor of (?:Medicine|Nursing|Pharmacy|Dental|Oral|Engineering|Architecture|Laws))/i.test(name)) {
    return "Bachelor's Degree (Professional)";
  }
  return "Bachelor's Degree";
}

function programmeDescription(name) {
  const type = qualificationType(name);
  const field = name
    .replace(/^(?:Advanced Diploma|Higher Certificate|Diploma)\s+in\s+/i, '')
    .replace(/^Bachelor(?:'s)?(?:\s+Degree)?\s+of\s+/i, '')
    .replace(/^Baccalaureus\s+/i, '')
    .replace(/^(?:Health Sciences|Science|Arts|Commerce|Social Science|Education|Engineering|Information Science|Information Technology)\s+(?:in|specialising in)\s+/i, '')
    .replace(/\s*\([A-Z]{2,7}\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (type === 'Higher Certificate') {
    return `This higher certificate provides foundational study in ${field}, developing practical knowledge and a pathway to further study or entry-level work.`;
  }
  if (type === 'Diploma' || type === 'Advanced Diploma') {
    return `This diploma develops applied knowledge and practical skills in ${field}, preparing graduates for related technical and professional roles.`;
  }
  if (type === "Bachelor's Degree (Professional)") {
    return `This professional bachelor's programme combines disciplinary knowledge and applied training in ${field}, preparing graduates for practice in the field.`;
  }
  return `This bachelor's programme provides comprehensive study in ${field}, building disciplinary knowledge, analytical skills and preparation for related careers or postgraduate study.`;
}

function descriptionMatchesProgramme(name, description) {
  if (!description) return false;
  const ignored = new Set([
    'advanced', 'bachelor', 'certificate', 'degree', 'diploma', 'education',
    'extended', 'management', 'programme', 'science', 'sciences', 'studies'
  ]);
  const keywords = name.toLowerCase().match(/[a-z]{5,}/g)?.filter((word) => !ignored.has(word)) ?? [];
  const lowerDescription = description.toLowerCase();
  return keywords.some((word) => lowerDescription.includes(word));
}

function programmeKey(name) {
  return name.toLowerCase()
    .replace(/\([a-z]{2,7}\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractLongNames(cell) {
  const value = clean(cell)
    .replace(/\b(?:PROGRAMME|PROGRAMMES|QUALIFICATION|DEGREE WITH PLANS)\b\s*/gi, '')
    .replace(/\s+(?:Suggested second-choice|Careers?:|Admission requirements?:|Entry requirements?:).*$/i, '')
    .trim();

  if (value.length < 5 || value.length > 700) return [];

  const starts = [];
  const expression = /\b(?:Advanced Diploma|Higher Certificate|Diploma(?:\s+in)?|Bachelor(?:'s)?\s+(?:Degree|of)|MBChB|Baccalaureus)\b/gi;
  for (const match of value.matchAll(expression)) starts.push(match.index);
  if (!starts.length) return [];

  starts.push(value.length);
  return starts.slice(0, -1)
    .map((start, index) => value.slice(start, starts[index + 1]))
    .map((name) => name
      .replace(/\s+(?:NSC|APS|AP|minimum|with Maths|with Mathematics|Code\b|CAO\b|Grade\s+\d).*$/i, '')
      .replace(/\s*\[[1-7]\s*years?]\s*/gi, ' ')
      .replace(/\s+[3-7](?:\s+[3-7])*\s*$/g, '')
      .replace(/\s+(?:[3-7]\s+)*(?:1[8-9]|[2-4]\d)\s*$/g, '')
      .replace(/\s+\(?[A-Z]\d[A-Z0-9]{2,}\)?$/i, '')
      .replace(/[|;,:.\s-]+$/g, '')
      .trim())
    .filter((name) => name.length >= 10 && name.length <= 180)
    .filter((name) => !/\b(?:admission|applicant|requirement|holders|studies at|access to|endorsement|qualification|accepted|students?|subjects?|researchers?|employed|consultants?|minimum|credits?|programme provided|degree at)\b/i.test(name))
    .filter((name) => !/\b(?:Bachelor|Diploma|of|in|and|with)\s*$/i.test(name))
    .filter((name) => {
      const ignored = new Set(['of', 'in', 'and', 'the', 'with', 'specialising']);
      const words = name.split(/\s+/).filter((word) => /^[A-Za-z]/.test(word) && !ignored.has(word.toLowerCase()));
      const titleWords = words.filter((word) => /^[A-Z]/.test(word) || /^[A-Z]{2,}$/.test(word));
      return words.length > 0 && titleWords.length / words.length >= 0.65;
    });
}

function apsFromRow(cells, programmeCellIndex, rowText) {
  const explicit = rowText.match(/\b(?:APS|AP|points?|score)\D{0,18}(1[8-9]|[2-4]\d)\b/i);
  if (explicit) return Number(explicit[1]);

  for (const cell of cells.slice(programmeCellIndex + 1)) {
    const value = clean(cell);
    if (/\b(?:year|yr)s?\b/i.test(value)) continue;
    const match = value.match(/(?:^|\D)(1[8-9]|[2-4]\d)(?:\D|$)/);
    if (match) return Number(match[1]);
  }
  return 0;
}

function durationFromRow(rowText) {
  const match = rowText.match(/\b([1-7](?:\s*[-–]\s*[1-7])?)\s*(years?|yrs?)\b/i);
  if (!match) return 'See prospectus';
  const value = match[1].replace(/\s+/g, '');
  return `${value} ${value === '1' ? 'year' : 'years'}`;
}

// Some converted prospectuses separate the qualification name and duration
// into different OCR blocks. These values come from the duration/years-of-study
// sections in the corresponding markdown and keep regeneration deterministic.
const markdownDurationOverrides = new Map();
function registerDurations(universityName, duration, programmeNames) {
  for (const name of programmeNames) {
    markdownDurationOverrides.set(`${universityName}|${programmeKey(name)}`, duration);
  }
}

registerDurations('North-West University', '4 years', [
  'Bachelor of Pharmacy',
  'Bachelor of Science in Dietetics',
  'Bachelor of Social Work',
]);

registerDurations('Tshwane University of Technology', '4 years', [
  'Bachelor of Architecture',
  'Bachelor of Pharmacy',
]);
registerDurations('Tshwane University of Technology', '5 years', [
  'Bachelor of Architecture (Extended)',
]);

registerDurations('University of Cape Town', '3 years', [
  'Bachelor of Arts',
  'Bachelor of Social Science',
  'Bachelor of Social Science (Philosophy, Politics and Economics)',
  'Diploma in Theatre',
]);
registerDurations('University of Cape Town', '4 years', [
  'Bachelor of Science in Audiology',
  'Bachelor of Science in Speech-Language Pathology',
  'Bachelor of Social Work',
  'Bachelor of Arts (Fine Art)',
  'Bachelor of Arts (Theatre & Performance)',
  'Bachelor of Music',
]);

registerDurations('University of the Free State', '3 years', [
  'Bachelor of Sustainable Food Systems',
]);

registerDurations('University of Johannesburg', '3 years', [
  'Diploma in Architecture',
  'Diploma in Fashion Production',
  'Diploma in Jewellery Design and Manufacture',
]);
registerDurations('University of Johannesburg', '4 years', [
  'Bachelor of Science in Life and Environmental Sciences (Extended)',
]);

registerDurations('University of Limpopo', '3 years', [
  'Bachelor of Science (Physical Sciences stream)',
  'Bachelor of Commerce in Accountancy',
  'Bachelor of Science in Geology',
  'Bachelor of Commerce in Human Resource Management',
  'Bachelor of Commerce in Business Management',
  'Bachelor of Administration',
  'Bachelor of Development in Planning and Management',
]);
registerDurations('University of Limpopo', '4 years', [
  'Bachelor of Science in Agriculture in Plant Production',
  'Bachelor of Science in Agriculture in Animal Production',
  'Bachelor of Commerce in Business Management (Extended Curriculum )',
  'Bachelor of Science (Mathematical Sciences stream) (Extended Curriculum )',
  'Bachelor of Optometry',
  'Bachelor of Nursing',
  'Bachelor of Laws',
]);
registerDurations('University of Limpopo', '5 years', [
  'Bachelor of Laws (Extended Curriculum )',
]);

registerDurations('University of Pretoria', '3 years', [
  'Bachelor of Commerce in specialising in Marketing Management',
  'Bachelor of Commerce in specialising in Human Resource Management',
  'Bachelor of Information Science specialising in Publishing',
  'Bachelor of Information Technology in Information Systems',
  'Bachelor of Science in Computer Science',
  'Bachelor of Sports Science',
  'Bachelor of Science in Mathematics',
]);
registerDurations('University of Pretoria', '4 years', [
  'Bachelor of Nursing Science',
]);

registerDurations('University of the Western Cape', '3 years', [
  'Bachelor of Community Development',
  'Bachelor of Arts (BA)',
  'Bachelor of Theology (BTh)',
  'Bachelor of Oral Health (BOH)',
  'Bachelor of Arts in Sport, Recreation and Exercise Science',
  'Bachelor of Science in Sport and Exercise Science',
  'Bachelor of Commerce in Financial Accounting',
  'Bachelor of Science in Environmental and Water Science',
  'Bachelor of Science in Biotechnology',
  'Bachelor of Science in Biodiversity and Conservation Biology',
  'Bachelor of Science in Chemical Sciences',
  'Bachelor of Science in Mathematical & Statistical Sciences',
  'Bachelor of Science in Computer Science',
  'Bachelor of Commerce in Law',
]);
registerDurations('University of the Western Cape', '4 years', [
  'Bachelor of Social Work',
  'Bachelor of Library and Information Science (BLIS)',
  'Bachelor of Pharmacy',
  'Bachelor of Science in Dietetics and Nutrition',
  'Bachelor of Science in Occupational Therapy',
  'Bachelor of Science in Physiotherapy',
  'Bachelor of Nursing and Midwifery',
  'Bachelor of Education in Foundation Phase Teaching',
]);
registerDurations('University of the Western Cape', '5 years', [
  'Bachelor of Dental Surgery (BDS)',
]);

registerDurations('Vaal University of Technology', '3 years', [
  'Diploma in Fashion, Photography, Graphic Design & Fine Art',
  'Diploma in Tourism Management',
  'Diploma in Public Relations Management',
]);

registerDurations('Walter Sisulu University', '3 years', [
  'Diploma in Building Technology',
  'Diploma in Civil Engineering',
  'Diploma in Electrical Engineering',
  'Diploma in Mechanical Engineering',
]);
registerDurations('Walter Sisulu University', '4 years', [
  'Bachelor of Education in Foundation Phase Teaching',
  'Bachelor of Education in Senior Phase & FET Teaching (Creative Arts History)',
  'Bachelor of Education in Senior Phase & FET Teaching (Creative Arts English)',
  'Bachelor of Education in Senior Phase & FET Teaching (Humanities)',
  'Bachelor of Education in Senior Phase & FET Teaching (Languages)',
]);

function requirementsFromRow(rowText) {
  const requirements = [];
  const lower = rowText.toLowerCase();
  const seen = new Set();

  for (const subject of subjectNames) {
    const index = lower.indexOf(subject.toLowerCase());
    if (index < 0) continue;
    const canonical = subject.replace(/^Physical Science$/, 'Physical Sciences').replace(/^Life Science$/, 'Life Sciences');
    if (seen.has(canonical)) continue;
    const nearby = rowText.slice(index + subject.length, index + subject.length + 45);
    const levelMatch = nearby.match(/(?:level\s*)?([3-7])(?:\s*\(|\b)/i);
    const percentageMatch = nearby.match(/([3-7])0\s*%/);
    const level = levelMatch ? Number(levelMatch[1]) : percentageMatch ? Math.max(3, Math.min(7, Number(percentageMatch[1]) - 1)) : 1;
    requirements.push({ subject: canonical, level, compulsory: true });
    seen.add(canonical);
  }
  return requirements;
}

function extractFromMarkdown(filePath, university) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const programmes = [];
  const seen = new Set();
  const addProgramme = (programme) => {
    const key = programmeKey(programme.name);
    const record = {
      universityId: university.id,
      universityName: university.name,
      faculty: 'Not specified',
      subjectRequirements: [],
      ...programme,
      qualificationType: qualificationType(programme.name),
      description: descriptionMatchesProgramme(programme.name, programme.description)
        ? programme.description
        : programmeDescription(programme.name)
    };
    if (seen.has(key)) {
      const existingIndex = programmes.findIndex((candidate) => programmeKey(candidate.name) === key);
      if (existingIndex >= 0 && (programmes[existingIndex].apsScore ?? 0) < (record.apsScore ?? 0)) {
        programmes[existingIndex] = record;
      }
      return;
    }
    seen.add(key);
    programmes.push(record);
  };

  lines.forEach((line, rowIndex) => {
    if (!line.includes('|') || /^\s*\|?(?:\s*:?-+:?\s*\|)+/.test(line)) return;
    const cells = line.split('|');
    const rowText = clean(line);

    cells.forEach((cell, programmeCellIndex) => {
      for (const name of extractLongNames(cell)) {
        const key = programmeKey(name);
        if (seen.has(key)) continue;
        seen.add(key);

        programmes.push({
          universityId: university.id,
          universityName: university.name,
          name,
          faculty: facultyAt(lines, rowIndex),
          qualificationType: qualificationType(name),
          duration: durationFromRow(rowText),
          apsScore: apsFromRow(cells, programmeCellIndex, rowText),
          description: programmeDescription(name),
          subjectRequirements: requirementsFromRow(rowText)
        });
      }
    });
  });

  // Some prospectuses use qualification headings and prose blocks rather than
  // tables. Read the admission block following each heading as one record.
  lines.forEach((line, rowIndex) => {
    let heading = clean(line).replace(/^\s*\d+\s*/, '');
    if (!/^(?:Advanced Diploma|Higher Certificate|Diploma in|Bachelor of|MBChB)\b/i.test(heading)) return;
    if (heading.length < 8 || heading.length > 140) return;
    if (/^(?:Diploma|Bachelor(?:'s)? degree)$/i.test(heading)) return;

    if (/^Diploma in$/i.test(heading) && lines[rowIndex + 1]) {
      heading = `${heading} ${clean(lines[rowIndex + 1])}`;
    }
    heading = heading.replace(/\s*\[[1-7]\s*years?]\s*/gi, ' ').replace(/\s+/g, ' ').trim();
    const names = extractLongNames(heading);
    if (!names.length) return;

    const blockLines = [];
    for (let index = rowIndex + 1; index < Math.min(lines.length, rowIndex + 28); index += 1) {
      const next = clean(lines[index]);
      if (index > rowIndex + 1 && /^(?:Advanced Diploma|Higher Certificate|Diploma in|Bachelor of|MBChB)\b/i.test(next)) break;
      blockLines.push(next);
    }
    const block = blockLines.join(' ');
    for (const name of names) {
      const key = programmeKey(name);
      if (seen.has(key)) continue;
      const apsMatch = block.match(/Minimum Admission Point Score\D{0,10}(1[8-9]|[2-4]\d)/i);
      seen.add(key);
      programmes.push({
        universityId: university.id,
        universityName: university.name,
        name,
        faculty: facultyAt(lines, rowIndex),
        qualificationType: qualificationType(name),
        duration: durationFromRow(block),
        apsScore: apsMatch ? Number(apsMatch[1]) : 0,
        description: programmeDescription(name),
        subjectRequirements: requirementsFromRow(block)
      });
    }
  });

  // OCR-heavy one-page guides commonly spell out names after an abbreviated
  // form (for example, "BCom - Bachelor of Commerce"). These names remain
  // recoverable even when the source has no usable line or table structure.
  const documentText = fs.readFileSync(filePath, 'utf8');
  const spelledOut = /\b(?:Advanced Diploma|Higher Certificate|Diploma in|Bachelor of)\s+[A-Z][A-Za-z&(), -]{3,100}(?=\s*(?:[·•§]|\d\s*\(|<br>|$))/g;
  const spelledOutMatches = [...documentText.matchAll(spelledOut)];
  spelledOutMatches.forEach((match, matchIndex) => {
    const names = extractLongNames(match[0]);
    for (const name of names) {
      const key = programmeKey(name);
      if (seen.has(key)) continue;
      const nextIndex = spelledOutMatches[matchIndex + 1]?.index ?? Math.min(documentText.length, match.index + 1000);
      const nearby = clean(documentText.slice(match.index, nextIndex));
      const apsMatches = [...nearby.matchAll(/\b(1[8-9]|[2-4]\d)\b/g)];
      seen.add(key);
      programmes.push({
        universityId: university.id,
        universityName: university.name,
        name,
        faculty: facultyAt(lines, Math.max(0, documentText.slice(0, match.index).split(/\r?\n/).length - 1)),
        qualificationType: qualificationType(name),
        duration: durationFromRow(nearby),
        apsScore: apsMatches.length ? Number(apsMatches.at(-1)[1]) : 0,
        description: programmeDescription(name),
        subjectRequirements: requirementsFromRow(nearby)
      });
    }
  });

  if (university.name === 'University of the Western Cape') {
    let currentFaculty = 'Not specified';
    let currentFacultyAps = 0;
    lines.forEach((line, rowIndex) => {
      const value = clean(line);
      if (/FACULTY OF/i.test(value)) currentFaculty = facultyAt(lines, rowIndex);
      const facultyAps = value.match(/UWC Points.*?(?:Minimum of\s*)?([2-4]\d)/i);
      if (facultyAps) currentFacultyAps = Number(facultyAps[1]);

      const pieces = value.split(/(?=\b(?:Bachelor of|BA(?:\s|$)|BSc\b|BCom\b|B\s+Com\b|BAdmi\b|B\s+Nursing\b|BEd\b))/);
      for (let name of pieces) {
        name = name.trim();
        if (!/^(?:Bachelor of|BA(?:\s|$)|BSc\b|BCom\b|B\s+Com\b|BAdmi\b|B\s+Nursing\b|BEd\b)/.test(name)) continue;
        const inlineAps = name.match(/(?:Minimum of\s*)?([2-4]\d)\s+UWC points/i);
        const lookAhead = clean(lines.slice(rowIndex, rowIndex + 8).join(' '));
        const nearbyAps = lookAhead.match(/(?:Minimum of\s*)?([2-4]\d)\s+UWC points/i);
        const apsScore = Number(inlineAps?.[1] ?? nearbyAps?.[1] ?? currentFacultyAps);
        name = name
          .replace(/\s+(?:Minimum of\s*)?[2-4]\d\s+UWC points.*$/i, '')
          .replace(/^BSc\s+/i, 'Bachelor of Science in ')
          .replace(/^BCom\s+/i, 'Bachelor of Commerce in ')
          .replace(/^B\s+Com\s+/i, 'Bachelor of Commerce in ')
          .replace(/^BAdmi\b/i, 'Bachelor of Administration')
          .replace(/^B\s+Nursing\b/i, 'Bachelor of Nursing')
          .replace(/^BEd\b/i, 'Bachelor of Education')
          .replace(/^BA\s+/i, 'Bachelor of Arts in ')
          .replace(/\s+/g, ' ')
          .trim();
        addProgramme({
          name,
          faculty: currentFaculty,
          duration: durationFromRow(value),
          apsScore,
          subjectRequirements: requirementsFromRow(lookAhead)
        });
      }
    });
  }

  if (university.name === 'Vaal University of Technology') {
    lines.forEach((line, rowIndex) => {
      const value = clean(line);
      const heading = value.match(/(?:^|\s)(?:Dip|Diploma):\s*([A-Za-z][A-Za-z &(),/-]+?)(?:\s*\(([1-7])\s*years?\))?$/i);
      if (!heading) return;
      const details = clean(lines.slice(rowIndex, rowIndex + 4).join(' '));
      const apsValues = [...details.matchAll(/\b(?:APS|TOTAL)\D{0,25}(1[8-9]|[2-4]\d)\b/gi)];
      if (!apsValues.length) return;
      addProgramme({
        name: `Diploma in ${heading[1].trim()}`,
        faculty: facultyAt(lines, rowIndex),
        duration: heading[2] ? `${heading[2]} years` : durationFromRow(details),
        apsScore: Number(apsValues[0][1]),
        subjectRequirements: requirementsFromRow(details)
      });
    });
  }

  if (university.name === 'University of the Witwatersrand') {
    let currentFaculty = 'Not specified';
    lines.forEach((line, rowIndex) => {
      const lineText = clean(line);
      if (/FACULTY OF/i.test(lineText)) currentFaculty = facultyAt(lines, rowIndex);
      for (const row of line.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => clean(cell[1]));
        if (cells.length < 3 || !/^[1-6]$/.test(cells[1]) || !/^([2-4]\d)\+?$/.test(cells[2])) continue;
        let name = cells[0].replace(/\*+$/g, '').trim();
        if (/^(?:School|Programme|Professional|Health Sciences:)/i.test(name)) continue;
        if (!/^(?:Bachelor|Diploma|LLB)/i.test(name)) {
          if (currentFaculty === 'Commerce & Management' && /^Accounting Science$/i.test(name)) name = 'Bachelor of Accounting Science';
          else if (currentFaculty === 'Commerce & Management' && /^Accounting$/i.test(name)) name = 'Bachelor of Accounting';
          else if (currentFaculty === 'Commerce & Management' && /^Economic Science$/i.test(name)) name = 'Bachelor of Economic Science';
          else if (/^(?:Metallurgy|Civil|Electrical|Biomedical|Aeronautical|Industrial|Mechanical|Mining).*Engineering/i.test(name)) name = `Bachelor of Engineering in ${name}`;
          else if (/^Digital Arts$/i.test(name) && currentFaculty === 'Engineering & Built Environment') name = 'Bachelor of Engineering Science in Digital Arts';
          else if (/^Architectural Studies/i.test(name)) name = 'Bachelor of Architectural Studies';
          else if (/^(?:Urban and Regional Planning|Construction Studies|Property Studies)$/i.test(name)) name = `Bachelor of Science in ${name}`;
          else if (/Foundation Phase|Intermediate Phase|Senior Phase/i.test(name)) name = `Bachelor of Education in ${name}`;
          else if (/^Arts\b/i.test(name)) name = `Bachelor of ${name}`;
          else if (/^(?:Music|Speech|Audiology|Social Work)/i.test(name)) name = `Bachelor of Arts in ${name}`;
          else if (/Science|Studies|Chemistry|Astronomy|Mathematics|Comput/i.test(name)) name = `Bachelor of Science in ${name}`;
          else name = `Bachelor of ${name}`;
        }
        if (/^LLB/i.test(name)) name = 'Bachelor of Laws (LLB)';
        addProgramme({
          name,
          faculty: currentFaculty,
          duration: `${cells[1]} ${cells[1] === '1' ? 'year' : 'years'}`,
          apsScore: Number(cells[2].match(/\d+/)[0]),
          subjectRequirements: requirementsFromRow(cells.join(' '))
        });
      }
    });
  }

  if (university.name === 'Walter Sisulu University') {
    lines.forEach((line, rowIndex) => {
      const value = clean(line);
      const listed = value.match(/^(W\d{5})\s+\d+\s+((?:Advanced Diploma|Higher Certificate|Diploma|Bachelor)[A-Za-z &(),/-]+?)(?:\s+[5-8]\s+(?:120|240|360|480)\s+([1-6]))?$/i);
      if (!listed) return;
      const [, code, rawName, inlineDuration] = listed;
      const laterCodeIndex = lines.findIndex((candidate, index) => index > rowIndex + 2 && clean(candidate).includes(code));
      if (laterCodeIndex < 0) return;
      const detailLines = lines.slice(laterCodeIndex + 1, laterCodeIndex + 85);
      const apsLineIndex = detailLines.findIndex((candidate) => /^(1[8-9]|[2-4]\d)(?:\s+ECP)?$/i.test(clean(candidate)));
      if (apsLineIndex < 0) return;
      const apsScore = Number(clean(detailLines[apsLineIndex]).match(/\d+/)[0]);
      let description = '';
      const overviewIndex = detailLines.findIndex((candidate, index) =>
        index > apsLineIndex && /^(?:The|This)\s+(?:primary\s+)?(?:purpose|objective|aim|qualification|program|programme|Diploma)/i.test(clean(candidate))
      );
      if (overviewIndex >= 0) {
        description = clean(detailLines.slice(overviewIndex, overviewIndex + 6).join(' '));
        const sentences = description.match(/^.*?[.!](?:\s|$)/);
        if (sentences) description = sentences[0].trim();
        if (description.length > 420) description = `${description.slice(0, 417).trimEnd()}…`;
      }
      const durationDetails = clean(lines.slice(rowIndex, rowIndex + 4).join(' '));
      addProgramme({
        name: rawName.trim(),
        faculty: facultyAt(lines, rowIndex),
        duration: inlineDuration ? `${inlineDuration} ${inlineDuration === '1' ? 'year' : 'years'}` : durationFromRow(durationDetails),
        apsScore,
        description,
        subjectRequirements: requirementsFromRow(detailLines.slice(0, 25).map(clean).join(' '))
      });
    });
  }

  if (university.name === 'Central University of Technology') {
    const source = clean(documentText);
    const listedProgramme = /\b((?:Higher Certificate|Diploma|Bachelor|B\s*\.\s*Ed|ECP)[A-Za-z&().,:/' -]{3,120}?)\s+(\d{2})\s*points?\s+((?:1\s*year\s*plus\s*)?[1-7](?:\s*years?)?)/gi;
    for (const match of source.matchAll(listedProgramme)) {
      let name = match[1]
        .replace(/^.*?matriculation exemption\.\s*/i, '')
        .replace(/^B\s*\.\s*Ed/i, 'Bachelor of Education')
        .replace(/^ECP in (.+)$/i, 'Bachelor of Management Sciences in $1 (Extended Curriculum)')
        .replace(/^Diploma in Engineering Technology in Mechanical$/i, 'Diploma in Engineering Technology in Mechanical Engineering')
        .replace(/\s+/g, ' ')
        .trim();
      if (/^Bachelor of Management Sciences$/i.test(name)) {
        name = 'Bachelor of Management Sciences in Internal Auditing';
      }
      const durationMatch = match[3].match(/([1-7])\s*(?:years?|$)/i);
      addProgramme({
        name,
        faculty: facultyAt(lines, Math.max(0, documentText.slice(0, match.index).split(/\r?\n/).length - 1)),
        duration: durationMatch ? `${durationMatch[1]} ${durationMatch[1] === '1' ? 'year' : 'years'}` : 'See prospectus',
        apsScore: Number(match[2]),
        subjectRequirements: requirementsFromRow(source.slice(Math.max(0, match.index - 350), match.index + match[0].length))
      });
    }
  }

  if (university.name === 'University of Venda') {
    programmes.length = 0;
    seen.clear();
    lines.forEach((line, rowIndex) => {
      if (!line.startsWith('|')) return;
      const cells = line.split('|').map(clean);
      if (cells.length < 5) return;
      const admission = cells[3] ?? '';
      const apsMatch = admission.match(/\b(?:NSC|NCS)\s*(\d{2})\b/i);
      if (!apsMatch) return;

      let name = cells[1]
        .replace(/\bEXTE(?:NDED)?(?:\s+BSC\s+DEGREE\s+PROGRAMME)?\b/gi, '')
        .replace(/^Extended BSc in\s+/i, 'Bachelor of Science in ')
        .replace(/\s+/g, ' ')
        .trim();
      if (/^Bachelor of Science in/i.test(name) && /^Extended BSc/i.test(cells[1])) {
        name = `${name} (Extended Curriculum)`;
      } else if (/^Bachelor of Science/i.test(name) && /EXTE/i.test(cells[1])) {
        name = `${name} (Extended Curriculum)`;
      }

      addProgramme({
        name,
        faculty: facultyAt(lines, rowIndex),
        duration: durationFromRow(cells[4] ?? ''),
        apsScore: Number(apsMatch[1]),
        subjectRequirements: requirementsFromRow(admission)
      });
    });
  }

  if (university.name === 'University of KwaZulu-Natal') {
    programmes.length = 0;
    seen.clear();
    const normalizeUkznName = (value) => value
      .replace(/^B Sc En:\s*g\s*/i, 'Bachelor of Science in Engineering in ')
      .replace(/^B Sc Eng:\s*/i, 'Bachelor of Science in Engineering in ')
      .replace(/^B Sc Engineering$/i, 'Bachelor of Science in Engineering Access')
      .replace(/^B Sc Land$/i, 'Bachelor of Science in Land Surveying')
      .replace(/^B Sc Engineering Access$/i, 'Bachelor of Science in Engineering Access')
      .replace(/^B Sc Agric\.?\s*\.?\s*Agricultural Plant$/i, 'Bachelor of Science in Agriculture in Agricultural Plant Sciences')
      .replace(/^B Sc Agric\.?\s*Agricultural Economics$/i, 'Bachelor of Science in Agriculture in Agricultural Economics')
      .replace(/^B Sc Agric\.? Plant$/i, 'Bachelor of Science in Agriculture in Plant Pathology')
      .replace(/^B Sc Agric\.?\s*/i, 'Bachelor of Science in Agriculture in ')
      .replace(/^B Science Dietetics and Human Nutrition$/i, 'Bachelor of Science in Dietetics and Human Nutrition')
      .replace(/^B Sc Stream \(LES\) Life and Earth$/i, 'Bachelor of Science in Life and Earth Sciences')
      .replace(/^B Sc Stream M(?:\s+\(Mathematics\))?$/i, 'Bachelor of Science in Mathematics')
      .replace(/^B Sc Geographic Information Systems and Earth$/i, 'Bachelor of Science in Geographic Information Systems and Earth Observation')
      .replace(/^B Sc Applied$/i, 'Bachelor of Science in Applied Chemistry')
      .replace(/^B Sc Crop and Horticultural$/i, 'Bachelor of Science in Crop and Horticultural Science')
      .replace(/^B Sc Environmental Science B S Eil c nvronmenta and Earth Science$/i, 'Bachelor of Science in Environmental and Earth Science')
      .replace(/^B Sc Environmental Science B S Eil$/i, 'Bachelor of Science in Environmental Science')
      .replace(/^B Sc Geological$/i, 'Bachelor of Science in Geological Science')
      .replace(/^B Sc\.?\s*/i, 'Bachelor of Science in ')
      .replace(/^B Agricultural\s*/i, 'Bachelor of Agricultural ')
      .replace(/^B Architectural Studies$/i, 'Bachelor of Architectural Studies')
      .replace(/^B Dental Therapy$/i, 'Bachelor of Dental Therapy')
      .replace(/^Bachelor of Speech-Language Therapy$/i, 'Bachelor of Speech-Language Therapy')
      .replace(/^B Medical Science\s*/i, 'Bachelor of Medical Science in ')
      .replace(/^B Occupational Therapy$/i, 'Bachelor of Occupational Therapy')
      .replace(/^B Optometry$/i, 'Bachelor of Optometry')
      .replace(/^B Oral Hygiene$/i, 'Bachelor of Oral Hygiene')
      .replace(/^B Pharmacy$/i, 'Bachelor of Pharmacy')
      .replace(/^B Physiotherapy$/i, 'Bachelor of Physiotherapy')
      .replace(/^B Sport Science$/i, 'Bachelor of Sport Science')
      .replace(/^B Nursing$/i, 'Bachelor of Nursing')
      .replace(/^B Medicine & B S\s*urgery$/i, 'Bachelor of Medicine and Bachelor of Surgery')
      .replace(/^BEd\s*\(([^)]+)\)$/i, 'Bachelor of Education ($1)')
      .replace(/^BA\s*\(General Studies\)$/i, 'Bachelor of Arts (General Studies)')
      .replace(/^BA in\s+/i, 'Bachelor of Arts in ')
      .replace(/^BA\s+/i, 'Bachelor of Arts in ')
      .replace(/^B Soc Sc\s*/i, 'Bachelor of Social Science ')
      .replace(/^B SocSc\s*/i, 'Bachelor of Social Science ')
      .replace(/^B Social Work$/i, 'Bachelor of Social Work')
      .replace(/^Bachelor of Science in Engineering in\s*$/i, 'Bachelor of Science in Engineering in Mechanical Engineering')
      .replace(/^Bachelor of Science in Engineering in (Chemical|Civil|Electrical|Electronic|Mechanical)\s*$/i, 'Bachelor of Science in Engineering in $1 Engineering')
      .replace(/^Bachelor of Science in Engineering in Agricultural$/i, 'Bachelor of Science in Engineering in Agricultural Engineering')
      .replace(/^Bachelor of Science in Agric\. Agricultural Economics$/i, 'Bachelor of Science in Agriculture in Agricultural Economics')
      .replace(/PoultryScience/g, 'Poultry Science')
      .replace(/Inform ation/g, 'Information')
      .replace(/^Bachelor of Social Science Geography/i, 'Bachelor of Social Science in Geography')
      .replace(/\s+/g, ' ')
      .trim();

    const inferUkznAps = (name, rowIndex, range) => {
      const values = [...range.matchAll(/\b(?:48\s*-\s*)?([2-4]\d)\b/g)].map((match) => Number(match[1]));
      if (values.length) return Math.min(...values);
      if (/Medicine and Bachelor of Surgery/i.test(name)) return 0;
      if (/Music Foundation/i.test(name)) return 22;
      if (rowIndex <= 655) {
        if (/Engineering in|Land Surveying/i.test(name)) return 33;
        if (/Engineering Access/i.test(name)) return 28;
        if (/Architectural|Stream|Information|Geographic|Life and Earth/i.test(name)) return 30;
        return 28;
      }
      if (rowIndex <= 680) return /Optometry|Pharmacy/i.test(name) ? 33 : 30;
      return 28;
    };

    const inferUkznDuration = (name, rowIndex, value) => {
      const explicit = durationFromRow(value);
      if (explicit !== 'See prospectus') return explicit;
      if (/Medicine and Bachelor of Surgery/i.test(name)) return '6 years';
      if (/Engineering in|Nursing|Occupational Therapy|Audiology|Speech-Language|Agriculture|Social Work|Education/i.test(name)) return '4 years';
      if (/Engineering Access/i.test(name)) return '1 year';
      return '3 years';
    };

    for (let rowIndex = 630; rowIndex < Math.min(lines.length, 698); rowIndex += 1) {
      if (!lines[rowIndex].startsWith('|')) continue;
      const cells = lines[rowIndex].split('|').map(clean);
      const layouts = cells.length > 9
        ? [{ name: 1, code: 2, details: 3, range: 3, duration: 4 }, { name: 5, code: 6, details: 7, range: 8, duration: 9 }]
        : [{ name: 1, code: 2, details: 3, range: 4, duration: 5 }];

      for (const layout of layouts) {
        if (!/\bKN-[A-Z]-/i.test(cells[layout.code] ?? '')) continue;
        let rawName = cells[layout.name] ?? '';
        if (/B Medicine & B S$/i.test(rawName)) {
          const nextCells = lines[rowIndex + 1]?.split('|').map(clean) ?? [];
          rawName = `${rawName}${nextCells[layout.name] ?? ''}`;
        }
        if (!/^(?:B|Bachelor)/i.test(rawName)) {
          for (let previous = rowIndex - 1; previous >= Math.max(630, rowIndex - 3); previous -= 1) {
            const previousCells = lines[previous].split('|').map(clean);
            const prefix = previousCells[layout.name] ?? '';
            if (/^(?:B|Bachelor)/i.test(prefix)) {
              rawName = `${prefix} ${rawName}`;
              break;
            }
          }
        }
        if (!/^(?:B|Bachelor)/i.test(rawName)) continue;

        const name = normalizeUkznName(rawName);
        const range = cells[layout.range] ?? '';
        addProgramme({
          name,
          faculty: facultyAt(lines, rowIndex),
          duration: inferUkznDuration(name, rowIndex, cells[layout.duration] ?? ''),
          apsScore: inferUkznAps(name, rowIndex, range),
          subjectRequirements: requirementsFromRow(cells[layout.details] ?? '')
        });
      }
    }

    addProgramme({
      name: 'Bachelor of Commerce (General) (Extended Curriculum)',
      faculty: 'Commerce & Management',
      duration: '4 years',
      apsScore: 26,
      subjectRequirements: requirementsFromRow('Mathematics level 3 and English and Life Orientation level 4')
    });
    addProgramme({
      name: 'Bachelor of Commerce (Accounting) (Extended Curriculum)',
      faculty: 'Commerce & Management',
      duration: '4 years',
      apsScore: 28,
      subjectRequirements: requirementsFromRow('Mathematics, English and Life Orientation level 4')
    });
  }

  // TUT's compact career guide is laid out as text columns rather than a
  // Markdown table. A programme row starts with its abbreviated qualification
  // name and ends with the duration and closing date; the APS follows in the
  // same text block.
  if (university.name === 'Tshwane University of Technology') {
    const tutStart = /^(?:Dip|HCert|BArch|BGeomatics|BEng|BEd|BEnvironmental|BNursing|BPharm|BRad|BHSci|BSc)\b/i;
    const tutName = (value) => value
      .replace(/^Dip\s*\((.+)\)$/i, 'Diploma in $1')
      .replace(/^HCert\s*\((.+)\)$/i, 'Higher Certificate in $1')
      .replace(/^BArch\s*\/\s*Bachelor of Architecture/i, 'Bachelor of Architecture')
      .replace(/^BGeomatics$/i, 'Bachelor of Geomatics')
      .replace(/^BEngTech\s*\((.+)\)$/i, 'Bachelor of Engineering Technology in $1')
      .replace(/^BEng\s*\((.+)\)$/i, 'Bachelor of Engineering in $1')
      .replace(/^BEd\s*\((.+)\)$/i, 'Bachelor of Education in $1')
      .replace(/^BEnvironmental Health$/i, 'Bachelor of Environmental Health')
      .replace(/^BNursing$/i, 'Bachelor of Nursing')
      .replace(/^BPharm(?:\s*\/\s*Bachelor of Pharmacy)?$/i, 'Bachelor of Pharmacy')
      .replace(/^BRad\s*\(Diagnostic\)\s*\/\s*Bachelor of Radiography in Diagnostics$/i, 'Bachelor of Radiography in Diagnostics')
      .replace(/^BHSci\s*\((.+)\)$/i, 'Bachelor of Health Sciences in $1')
      .replace(/^BSc\s*\((.+)\)$/i, 'Bachelor of Science in $1')
      .replace(/^((?:Diploma|Bachelor|Higher Certificate).+?)\)\s+\((.+)$/, '$1 ($2)')
      .replace(/\s+/g, ' ')
      .trim();

    for (let rowIndex = 0; rowIndex < lines.length; rowIndex += 1) {
      if (!tutStart.test(clean(lines[rowIndex]))) continue;
      let header = clean(lines[rowIndex]);
      let endIndex = rowIndex;
      while (!/\b[1-6]\s+\d{1,2}\/\d\b/.test(header) && endIndex < Math.min(lines.length - 1, rowIndex + 5)) {
        endIndex += 1;
        header = `${header} ${clean(lines[endIndex])}`;
      }
      const headerMatch = header.match(/^(.+?)\s+(?:(?:Ar|E|M|O|Po|Pr|SN|SS)\s+)*([1-6])\s+\d{1,2}\/\d\b/i);
      if (!headerMatch) continue;

      const detailLines = [];
      for (let index = endIndex; index < Math.min(lines.length, endIndex + 34); index += 1) {
        if (index > endIndex && tutStart.test(clean(lines[index]))) break;
        detailLines.push(clean(lines[index]));
      }
      const details = detailLines.join(' ');
      const afterClosingDate = details.replace(/^.*?\b\d{1,2}\/\d\b/, '');
      const apsMatch = afterClosingDate.match(/(?:^|\s)(1[8-9]|[2-4]\d)(?=\s|$)/);
      if (!apsMatch) continue;
      const name = tutName(headerMatch[1]);
      const faculty = rowIndex < 500 ? 'Humanities'
        : rowIndex < 660 ? 'Commerce & Management'
          : rowIndex < 960 ? 'Engineering & Built Environment'
            : rowIndex < 1400 ? 'Humanities'
              : rowIndex < 1580 ? 'Science & IT'
                : rowIndex < 1840 ? 'Commerce & Management'
                  : rowIndex < 2010 ? 'Science & IT'
                    : rowIndex < 2170 ? 'Health Sciences'
                      : 'Science & IT';
      addProgramme({
        name,
        faculty,
        duration: `${headerMatch[2]} ${headerMatch[2] === '1' ? 'year' : 'years'}`,
        apsScore: Number(apsMatch[1]),
        subjectRequirements: requirementsFromRow(afterClosingDate)
      });
      rowIndex = endIndex;
    }
  }

  // The two-page VUT guide mixes prose blocks and visual tables. Keep its
  // published undergraduate catalogue explicit so OCR column order cannot
  // silently remove whole departments during regeneration.
  if (university.name === 'Vaal University of Technology') {
    const vutProgrammes = [
      ['Diploma in Analytical Chemistry', 3, 21], ['Diploma in Agricultural Management', 3, 21],
      ['Diploma in Information Technology', 3, 26], ['Diploma in Information Technology (Extended)', 4, 24],
      ['Diploma in Non-Destructive Testing', 3, 19], ['Diploma in Biotechnology', 3, 23],
      ['Diploma in Environmental Science', 3, 21], ['Bachelor of Health Sciences in Medical Laboratory Science', 4, 27],
      ['Diploma in Financial Information Systems', 3, 20], ['Diploma in Cost and Management Accounting', 3, 20],
      ['Diploma in Internal Auditing', 3, 20], ['Diploma in Human Resources Management', 3, 20],
      ['Diploma in Logistics and Supply Chain Management', 3, 20], ['Diploma in Marketing Management', 3, 20],
      ['Diploma in Retail Business Management', 3, 20], ['Diploma in Sport Management', 3, 20],
      ['Diploma in Fashion, Photography, Graphic Design & Fine Art', 3, 21], ['Diploma in Food Service Management', 3, 20],
      ['Diploma in Public Relations Management', 3, 20], ['Diploma in Legal Assistance', 3, 23],
      ['Diploma in Labour Law', 3, 23], ['Diploma in Policing', 3, 20],
      ['Bachelor of Communication Studies', 3, 20], ['Diploma in Tourism Management', 3, 20],
      ['Diploma in Ecotourism Management', 3, 20], ['Diploma in Safety Management', 3, 21],
      ['Bachelor of Education in Senior Phase & FET Teaching', 4, 22], ['Diploma in Chemical Engineering', 3, 24],
      ['Diploma in Civil Engineering', 3, 24], ['Diploma in Industrial Engineering', 3, 24],
      ['Diploma in Mechanical Engineering', 3, 24], ['Diploma in Metallurgical Engineering', 3, 24],
      ['Diploma in Electronic Engineering', 3, 24], ['Diploma in Power Engineering', 3, 24],
      ['Diploma in Process Control Engineering', 3, 24], ['Diploma in Computer Systems Engineering', 3, 24],
      ['Diploma in Operations Management', 3, 23], ['Diploma in Chemical Engineering (Extended)', 4, 22],
      ['Diploma in Civil Engineering (Extended)', 4, 22], ['Diploma in Industrial Engineering (Extended)', 4, 22],
      ['Diploma in Mechanical Engineering (Extended)', 4, 22], ['Diploma in Metallurgical Engineering (Extended)', 4, 22],
      ['Diploma in Electronic Engineering (Extended)', 4, 22], ['Diploma in Power Engineering (Extended)', 4, 22],
      ['Diploma in Process Control Engineering (Extended)', 4, 22], ['Diploma in Computer Systems Engineering (Extended)', 4, 22]
    ];
    for (const [name, years, apsScore] of vutProgrammes) {
      addProgramme({ name, duration: `${years} ${years === 1 ? 'year' : 'years'}`, apsScore });
    }
  }

  if (university.name === 'Rhodes University') {
    const rhodesProgrammes = [
      ['Bachelor of Business Science', 4, 38, 'Commerce & Management'],
      ['Bachelor of Commerce', 3, 34, 'Commerce & Management'],
      ['Bachelor of Economics', 3, 34, 'Commerce & Management'],
      ['Bachelor of Commerce (Extended Studies)', 4, 34, 'Commerce & Management'],
      ['Bachelor of Arts', 3, 34, 'Humanities'], ['Bachelor of Social Science', 3, 34, 'Humanities'],
      ['Bachelor of Fine Arts', 4, 34, 'Humanities'], ['Bachelor of Music', 4, 34, 'Humanities'],
      ['Bachelor of Journalism', 4, 34, 'Humanities'], ['Bachelor of Arts or Social Science (Extended Studies)', 4, 34, 'Humanities'],
      ['Bachelor of Education in Foundation Phase Teaching', 4, 39, 'Education'],
      ['Bachelor of Laws (LLB)', 4, 40, 'Law'], ['Bachelor of Pharmacy', 4, 40, 'Health Sciences'],
      ['Bachelor of Science', 3, 39, 'Science & IT'], ['Bachelor of Information Systems', 3, 40, 'Science & IT']
    ];
    for (const [name, years, apsScore, faculty] of rhodesProgrammes) {
      addProgramme({ name, faculty, duration: `${years} years`, apsScore });
    }
  }

  // UJ's converted PDF preserves qualification codes reliably even when the
  // two-column programme labels are interleaved. Extract the unambiguous code
  // blocks and use the nearest programme heading as the specialisation name.
  if (university.name === 'University of Johannesburg') {
    const ujOverrides = new Map(Object.entries({
      B8BA3Q: 'Bachelor of Architecture', B8CD2Q: 'Bachelor of Arts in Communication Design',
      B8DM3Q: 'Bachelor of Arts in Digital Media Design', B8ID1Q: 'Bachelor of Arts in Industrial Design',
      B8BA6Q: 'Bachelor of Arts in Interior Design', B8FD1Q: 'Bachelor of Arts in Fashion Design',
      B8BA7Q: 'Bachelor of Arts in Visual Art', D8JD1Q: 'Diploma in Jewellery Design and Manufacture',
      D8FP1Q: 'Diploma in Fashion Production', D8AT1Q: 'Diploma in Architecture',
      B34HRQ: 'Bachelor of Commerce in Human Resource Management', B34HNQ: 'Bachelor of Commerce in Hospitality Management',
      D34FBQ: 'Diploma in Food and Beverage Operations', D34F9Q: 'Diploma in Financial Services Operations',
      D3A15Q: 'Diploma in Business Information Technology', B5BFPQ: 'Bachelor of Education in Foundation Phase Teaching',
      B5BITQ: 'Bachelor of Education in Intermediate Phase Teaching', B9N02Q: 'Bachelor of Nursing',
      B9O02Q: 'Bachelor of Optometry', B4A01Q: 'Bachelor of Arts in Law',
      B4C01Q: 'Bachelor of Commerce in Law', B4L03Q: 'Bachelor of Laws (LLB)',
      B34TDQ: 'Bachelor of Commerce in Tourism Development and Management',
      B34A5Q: 'Bachelor of Commerce in Accounting', B34IMQ: 'Bachelor of Commerce in Information Management',
      B6PY2Q: 'Bachelor of Engineering Technology in Physical Metallurgy',
      B6UP0Q: 'Bachelor of Urban and Regional Planning', B6CN0Q: 'Bachelor of Construction',
      B9M04Q: 'Bachelor of Health Sciences in Radiation Therapy', B9C01Q: 'Bachelor of Chiropractic',
      B9SE1Q: 'Bachelor of Health Sciences in Sport and Exercise Science',
      B2I02Q: 'Bachelor of Science in Computer Science and Informatics', B2I04Q: 'Bachelor of Science in Informatics',
      B2M40Q: 'Bachelor of Science in Applied Mathematics and Computer Science',
      B2M42Q: 'Bachelor of Science in Applied Mathematics and Statistics',
      B2P71Q: 'Bachelor of Science in Chemistry and Mathematics', B2P82Q: 'Bachelor of Science in Geology and Mathematics',
      B2P78Q: 'Bachelor of Science in Physics and Mathematics',
      B2E02Q: 'Bachelor of Science in Computer Science and Informatics',
      B2E10Q: 'Bachelor of Science in Biochemistry and Botany', B2E11Q: 'Bachelor of Science in Botany and Chemistry',
      B2E12Q: 'Bachelor of Science in Botany and Zoology', B2E13Q: 'Bachelor of Science in Geography and Environmental Management',
      B2E14Q: 'Bachelor of Science in Physiology and Biochemistry', B2E22Q: 'Bachelor of Science in Physiology and Psychology',
      B2E17Q: 'Bachelor of Science in Zoology and Biochemistry', B2E18Q: 'Bachelor of Science in Zoology and Chemistry',
      B2E19Q: 'Bachelor of Science in Zoology and Environmental Management', B2E20Q: 'Bachelor of Science in Zoology and Geography',
      B2E40Q: 'Bachelor of Science in Applied Mathematics and Computer Science',
      B2E41Q: 'Bachelor of Science in Applied Mathematics and Mathematical Statistics',
      B2E42Q: 'Bachelor of Science in Applied Mathematics and Statistics',
      B2E43Q: 'Bachelor of Science in Mathematical Statistics and Computer Science',
      B2E44Q: 'Bachelor of Science in Computer Science', B2E45Q: 'Bachelor of Science in Informatics',
      B2E46Q: 'Bachelor of Science in Mathematical Statistics', B2E49Q: 'Bachelor of Science in Psychology',
      B2E70Q: 'Bachelor of Science in Biochemistry and Chemistry', B2E71Q: 'Bachelor of Science in Chemistry and Mathematics',
      B2E72Q: 'Bachelor of Science in Chemistry and Physics', B2E73Q: 'Bachelor of Science in Physics and Applied Mathematics',
      B2E74Q: 'Bachelor of Science in Physics and Mathematics'
    }));
    const ignoredHeading = /^(?:PROGRAMME|Qualification Code|Minimum APS|English|Additional Recognised Language|Mathematics|Mathematical Literacy|Technical Mathematics|Physical Science|Life Science|CAREER|CAMPUS|DEGREE PROGRAMMES|DIPLOMA PROGRAMMES|ONLY|NOTES?)$/i;
    const codeRows = [];
    lines.forEach((line, rowIndex) => {
      const code = clean(line);
      if (/^[BD][A-Z0-9]{4,8}Q$/.test(code)) codeRows.push({ code, rowIndex });
    });
    codeRows.forEach(({ code, rowIndex }, codeIndex) => {
      let name = ujOverrides.get(code);
      const previousCodeRow = codeRows[codeIndex - 1]?.rowIndex ?? Math.max(0, rowIndex - 20);
      const headings = lines.slice(previousCodeRow + 1, rowIndex)
        .map((line) => line.match(/^###\s+(.+)/)?.[1]?.trim())
        .filter((heading) => heading && !ignoredHeading.test(heading) && !/^[BD][A-Z0-9]{4,8}Q$/.test(heading));
      const field = headings.slice(-3).join(' ').replace(/\s+/g, ' ').replace(/^.*?PROGRAMMES?\s+/i, '').trim();
      const details = clean(lines.slice(rowIndex + 1, rowIndex + 18).join(' '));
      const apsMatch = details.match(/\b(1[8-9]|[2-4]\d)\b/);
      if (!name && field.length >= 4 && field.length <= 90 && !/^(?:MANAGEMENT|ENGINEERING|SCIENCE)$/i.test(field)) {
        const title = titleCaseUppercaseName(field).replace(/\s+And\s+/g, ' and ');
        if (code.startsWith('D')) name = `Diploma in ${title}`;
        else if (rowIndex < 3100) name = `Bachelor of Commerce in ${title}`;
        else if (rowIndex < 3700) name = `Bachelor of Education in ${title}`;
        else if (rowIndex < 4300) name = `Bachelor of Engineering Technology in ${title}`;
        else if (rowIndex < 4800) name = `Bachelor of Health Sciences in ${title}`;
        else if (rowIndex < 5450) name = `Bachelor of Arts in ${title}`;
        else name = `Bachelor of Science in ${title}`;
      }
      if (!name || !apsMatch) return;
      if ((/^B2E/.test(code) || (rowIndex >= 4100 && rowIndex < 4210)) && !/Extended Curriculum/i.test(name)) {
        name = `${name} (Extended Curriculum)`;
      }
      const faculty = rowIndex < 2100 ? 'Humanities'
        : rowIndex < 3100 ? 'Commerce & Management'
          : rowIndex < 3700 ? 'Education'
            : rowIndex < 4300 ? 'Engineering & Built Environment'
              : rowIndex < 4800 ? 'Health Sciences'
                : rowIndex < 5450 ? 'Law' : 'Science & IT';
      const years = code.startsWith('D') ? 3 : rowIndex >= 4300 && rowIndex < 4800 ? 4 : /EXT|^B2E/i.test(code) ? 4 : 3;
      addProgramme({ name, faculty, duration: `${years} years`, apsScore: Number(apsMatch[1]), subjectRequirements: requirementsFromRow(details) });
    });
  }

  if (university.name === 'University of the Free State') {
    const ufsProgrammes = [
      ['Bachelor of Commerce', 28], ['Bachelor of Commerce in Economics', 28], ['Bachelor of Commerce in Finance', 28],
      ['Bachelor of Commerce in Business Analytics', 34], ['Bachelor of Commerce in Marketing', 28],
      ['Bachelor of Commerce in Business Management', 28], ['Bachelor of Commerce in Human Resource Management', 28],
      ['Bachelor of Commerce in Law', 33], ['Bachelor of Administration', 28], ['Bachelor of Accounting', 34],
      ['Bachelor of Commerce in Accounting', 28], ['Bachelor of Commerce in Management', 28],
      ['Bachelor of Education in Foundation Phase Teaching', 30], ['Bachelor of Education in Intermediate Phase Teaching', 30],
      ['Bachelor of Education in Senior Phase and FET Teaching', 30],
      ['Bachelor of Medical Science in Radiation Science', 30], ['Bachelor of Medicine and Bachelor of Surgery', 36, 6],
      ['Bachelor of Optometry', 33, 4], ['Bachelor of Science in Physiotherapy', 33, 4],
      ['Bachelor of Science in Dietetics', 33, 4], ['Bachelor of Occupational Therapy', 33, 4],
      ['Bachelor of Biokinetics', 30, 4], ['Bachelor of Sport Coaching', 30, 3], ['Bachelor of Nursing', 30, 4],
      ['Bachelor of Laws (LLB)', 33, 4], ['Bachelor of Science in Botany and Plant Pathology', 32],
      ['Bachelor of Science in Botany and Zoology', 32], ['Bachelor of Science in Behavioural Genetics', 32],
      ['Bachelor of Science in Forensic Science', 34], ['Bachelor of Science in Genetics and Microbiology', 32],
      ['Bachelor of Science in Genetics and Physiology', 32], ['Bachelor of Science in Microbiology and Statistics', 32],
      ['Bachelor of Science in Plant Health Ecology', 32], ['Bachelor of Science in Plant Health Management', 32],
      ['Bachelor of Science in Biochemistry and Botany', 32], ['Bachelor of Science in Biochemistry and Genetics', 32],
      ['Bachelor of Science in Biochemistry and Microbiology', 32], ['Bachelor of Science in Biochemistry and Physiology', 32],
      ['Bachelor of Science in Biochemistry and Statistics', 32], ['Bachelor of Science in Mathematics and Applied Mathematics', 32],
      ['Bachelor of Science in Mathematics and Chemistry', 32], ['Bachelor of Science in Mathematics and Mathematical Statistics', 32],
      ['Bachelor of Science in Mathematics and Physics', 32], ['Bachelor of Science in Physics and Agrometeorology', 32],
      ['Bachelor of Science in Physics and Astrophysics', 32], ['Bachelor of Science in Actuarial Science', 34],
      ['Bachelor of Science in Computer Science and Chemistry', 32], ['Bachelor of Science in Computer Science and Mathematical Statistics', 32],
      ['Bachelor of Science in Computer Science and Mathematics', 32], ['Bachelor of Science in Computer Science and Physics', 32],
      ['Bachelor of Science in Data Science', 32], ['Bachelor of Science in Agricultural and Biosystems Engineering', 30, 4],
      ['Bachelor of Sustainable Food Systems', 30], ['Bachelor of Agriculture in Agricultural Economics', 30, 4],
      ['Bachelor of Agriculture in Agricultural Management', 30, 4], ['Bachelor of Agriculture in Agricultural Extension', 30, 4],
      ['Bachelor of Agriculture in Animal Production Management', 30, 4], ['Bachelor of Agriculture in Crop Production', 30, 4],
      ['Bachelor of Science in Agriculture in Animal Science', 32, 4], ['Bachelor of Science in Agriculture in Agrometeorology', 32, 4],
      ['Bachelor of Science in Agriculture in Agronomy', 32, 4], ['Bachelor of Science in Agriculture in Plant Breeding', 32, 4],
      ['Bachelor of Science in Agriculture in Plant Pathology', 32, 4], ['Bachelor of Science in Agriculture in Soil Science', 32, 4],
      ['Bachelor of Architecture', 30, 4], ['Bachelor of Science in Construction Economics and Management', 30],
      ['Bachelor of Science in Construction Management', 30], ['Bachelor of Science in Quantity Surveying', 30],
      ['Diploma in Music', 20], ['Bachelor of Arts in Language Practice', 30],
      ['Bachelor of Arts in Governance and Political Transformation', 30], ['Bachelor of Arts in Drama and Theatre Arts', 30],
      ['Bachelor of Arts specialising in Languages', 30], ['Bachelor of Music', 30, 4],
      ['Bachelor of Arts in Music', 30], ['Bachelor of Social Science', 30], ['Bachelor of Social Work', 35, 4],
      ['Bachelor of Community Development', 30], ['Bachelor of Divinity', 28]
    ];
    for (const [name, apsScore, years = 3] of ufsProgrammes) {
      addProgramme({ name, duration: `${years} years`, apsScore });
    }
  }

  if (university.name === 'University of Venda') {
    const vendaProgrammes = [
      ['Bachelor of Arts in Media Studies', 30, 3], ['Bachelor of Arts', 30, 3], ['Bachelor of Arts in Development Studies', 30, 3],
      ['Bachelor of Indigenous Knowledge Systems', 30, 4], ['Bachelor of Arts in Language Practice', 30, 4],
      ['Bachelor of Arts in English Language and Literature', 30, 3], ['Bachelor of Arts in International Relations', 30, 3],
      ['Bachelor of Arts in Youth Development', 30, 4], ['Bachelor of Arts in History', 30, 3], ['Bachelor of Theology', 30, 3],
      ['Higher Certificate in Music', 18, 1], ['Bachelor of Social Work', 35, 4],
      ['Bachelor of Education in Senior Phase and Further Education and Training', 36, 4],
      ['Bachelor of Education in Foundation Phase Teaching', 36, 4], ['Bachelor of Nursing', 38, 4],
      ['Bachelor of Science in Nutrition', 34, 4], ['Bachelor of Science in Sports and Exercise Science', 34, 4],
      ['Bachelor of Science in Biokinetics', 34, 4], ['Bachelor of Science in Recreation and Leisure Studies', 34, 4],
      ['Bachelor of Psychology', 36, 4], ['Diploma in Nursing', 28, 3],
      ['Bachelor of Administration in Public Administration', 32, 3], ['Bachelor of Commerce in Accounting Sciences', 35, 3],
      ['Bachelor of Commerce in Tourism Management', 32, 3], ['Bachelor of Commerce in Cost and Management Accounting', 32, 3],
      ['Bachelor of Commerce in Information Systems', 32, 3], ['Bachelor of Commerce in Business Management', 32, 3],
      ['Bachelor of Commerce in Marketing', 32, 3], ['Bachelor of Commerce in Economics', 32, 3],
      ['Bachelor of Commerce in Human Resource Management', 32, 3], ['Bachelor of Commerce in Industrial Psychology', 32, 3],
      ['Bachelor of Laws', 38, 4], ['Bachelor of Arts in Criminal Justice', 34, 3],
      ['Diploma in Freshwater Technology', 26, 3], ['Bachelor of Science in Biochemistry and Microbiology', 32, 3],
      ['Bachelor of Science in Biochemistry and Biology', 32, 3], ['Bachelor of Science in Microbiology and Botany', 32, 3],
      ['Bachelor of Science in Mathematics and Applied Mathematics', 32, 3], ['Bachelor of Science in Mathematics and Physics', 32, 3],
      ['Bachelor of Science in Mathematics and Statistics', 32, 3], ['Bachelor of Science in Chemistry', 32, 3],
      ['Bachelor of Science in Computer Science and Mathematics', 32, 3], ['Bachelor of Science in Physics and Biochemistry', 32, 3],
      ['Bachelor of Science in Applied Chemistry', 32, 3], ['Bachelor of Science in Botany and Zoology', 32, 3],
      ['Bachelor of Science in Computer Science', 32, 3], ['Bachelor of Environmental Sciences', 32, 4],
      ['Bachelor of Science in Mining Engineering', 35, 4], ['Bachelor of Science in Hydrology and Water Resources', 32, 4],
      ['Bachelor of Urban and Regional Planning', 32, 4], ['Bachelor of Science in Environmental and Resource Studies', 32, 4],
      ['Bachelor of Science in Agricultural Economics', 26, 4], ['Bachelor of Science in Agricultural Management', 26, 4],
      ['Bachelor of Science in Animal Science', 26, 4], ['Bachelor of Science in Horticultural Science', 26, 4],
      ['Bachelor of Science in Plant Production', 26, 4], ['Bachelor of Science in Soil Science', 26, 4],
      ['Bachelor of Science in Forestry', 26, 4], ['Bachelor of Science in Food Science and Technology', 26, 4],
      ['Bachelor of Science in Biochemistry and Microbiology (Extended Curriculum)', 26, 4],
      ['Bachelor of Science in Biochemistry and Biology (Extended Curriculum)', 26, 4],
      ['Bachelor of Science in Microbiology and Botany (Extended Curriculum)', 26, 4],
      ['Bachelor of Science in Mathematics and Applied Mathematics (Extended Curriculum)', 26, 4],
      ['Bachelor of Science in Computer Science and Mathematics (Extended Curriculum)', 26, 4],
      ['Bachelor of Science in Mathematics and Physics (Extended Curriculum)', 26, 4]
    ];
    for (const [name, apsScore, years] of vendaProgrammes) addProgramme({ name, duration: `${years} years`, apsScore });
  }

  if (university.name === 'University of Zululand') {
    const zululandProgrammes = [
      ['Bachelor of Arts in Environmental Planning and Development', 28, 3], ['Bachelor of Arts in Intercultural Communication', 26, 3],
      ['Diploma in Media Studies', 24, 3], ['Bachelor of Arts in Correctional Studies', 28, 3],
      ['Bachelor of Arts in Industrial Sociology', 26, 3], ['Bachelor of Arts in Anthropology and History', 26, 3],
      ['Bachelor of Arts in Geography and History', 26, 3], ['Bachelor of Arts in Geography and Tourism', 26, 3],
      ['Bachelor of Arts in History and IsiZulu', 26, 3], ['Bachelor of Arts in Linguistics and English', 26, 3],
      ['Bachelor of Arts in Philosophy and Psychology', 26, 3], ['Bachelor of Arts in Psychology', 28, 3],
      ['Bachelor of Arts in Drama, Theatre and Performance', 26, 3], ['Diploma in Public Relations Management', 24, 3],
      ['Bachelor of Arts in Development Studies', 26, 3], ['Bachelor of Arts in Information Science', 26, 3],
      ['Bachelor of Library and Information Science', 26, 4], ['Bachelor of Social Work', 28, 4],
      ['Bachelor of Arts in Sociology', 26, 3], ['Bachelor of Social Sciences in Political and International Studies', 26, 3],
      ['Bachelor of Tourism Studies', 26, 3], ['Diploma in Tourism Management', 24, 3],
      ['Bachelor of Education in Foundation Phase Teaching', 26, 4], ['Bachelor of Education in Intermediate Phase Teaching', 26, 4],
      ['Bachelor of Administration in Public Administration and Business Management', 28, 3],
      ['Bachelor of Administration in Public Administration and Economics', 28, 3],
      ['Bachelor of Administration in Public Administration and Human Resources', 28, 3],
      ['Bachelor of Administration in Public Administration and Political Science', 28, 3],
      ['Bachelor of Commerce in Accounting and Economics', 28, 3], ['Bachelor of Commerce in Accounting', 26, 4],
      ['Bachelor of Commerce in Banking and Business Management', 28, 3],
      ['Bachelor of Commerce in Business Management and Accounting', 28, 3],
      ['Bachelor of Commerce in Business Management and Economics', 28, 3],
      ['Bachelor of Commerce in Business Management and Human Resource Management', 26, 4],
      ['Bachelor of Commerce in Economics and Banking', 28, 3],
      ['Bachelor of Commerce in Economics and Human Resource Management', 28, 3],
      ['Bachelor of Commerce in Human Resource Management and Business Management', 28, 3],
      ['Bachelor of Commerce in Management Information Systems', 28, 3], ['Bachelor of Commerce in Accounting Science', 28, 3],
      ['Bachelor of Laws', 30, 4], ['Diploma in Co-Operatives Management', 24, 3],
      ['Diploma in Logistics Management', 24, 3], ['Diploma in Transport Management', 24, 3], ['Higher Certificate in Accountancy', 22, 1],
      ['Bachelor of Consumer Science in Extension and Rural Development', 28, 4],
      ['Bachelor of Consumer Science in Hospitality and Tourism', 28, 3],
      ['Bachelor of Engineering in Electrical Engineering', 30, 4],
      ['Bachelor of Engineering in Electrical and Computer Engineering', 30, 4],
      ['Bachelor of Engineering in Mechanical Engineering', 30, 4], ['Bachelor of Engineering in Mechatronic Engineering', 30, 4],
      ['Bachelor of Nursing Science', 30, 4], ['Bachelor of Science in Agriculture in Agronomy', 28, 4],
      ['Bachelor of Science in Agriculture in Animal Science', 28, 4],
      ['Bachelor of Science in Agricultural Economics and Agribusiness Management', 28, 4],
      ['Bachelor of Science in Applied Mathematics and Computer Science', 28, 3],
      ['Bachelor of Science in Applied Mathematics and Hydrology', 28, 3],
      ['Bachelor of Science in Applied Mathematics and Mathematics', 28, 3],
      ['Bachelor of Science in Applied Mathematics and Physics', 28, 3],
      ['Bachelor of Science in Applied Mathematics and Statistics', 28, 3],
      ['Bachelor of Science in Life Sciences (Augmented)', 28, 4], ['Bachelor of Science in Physical Sciences (Augmented)', 28, 4],
      ['Bachelor of Science in Biochemistry and Botany', 28, 3], ['Bachelor of Science in Biochemistry and Chemistry', 28, 3],
      ['Bachelor of Science in Biochemistry and Human Movement Science', 28, 3],
      ['Bachelor of Science in Biochemistry and Microbiology', 28, 3], ['Bachelor of Science in Biochemistry and Zoology', 28, 3],
      ['Bachelor of Science in Botany and Geography', 28, 3], ['Bachelor of Science in Botany and Hydrology', 28, 3],
      ['Bachelor of Science in Botany and Microbiology', 28, 3], ['Bachelor of Science in Botany and Zoology', 28, 3],
      ['Bachelor of Science (Foundation)', 26, 4], ['Diploma in Hospitality Management', 26, 3],
      ['Diploma in Sport and Exercise Technology', 26, 3]
    ];
    for (const [name, apsScore, years] of zululandProgrammes) addProgramme({ name, duration: `${years} years`, apsScore });
  }

  if (university.name === 'University of Cape Town') {
    programmes.length = 0;
    seen.clear();
    const uctProgrammes = [
      ...['Computer Science', 'Economics', 'Economics with Law', 'Finance, Investment and Banking', 'Finance with Accounting',
        'Information Systems', 'Marketing', 'Industrial and Organisational Psychology', 'Statistics and Data Science']
        .map((field) => [`Bachelor of Business Science specialising in ${field}`, /Computer Science|Statistics/.test(field) ? 435 : 435, 4]),
      ...['Financial Accounting', 'Economics with Law', 'Economics with Finance', 'Economics and Statistics', 'Information Systems',
        'Information Systems and Computer Science', 'Information Systems and Finance', 'Management Studies', 'Philosophy, Politics and Economics']
        .map((field) => [`Bachelor of Commerce with specialisation in ${field}`, 435, 3]),
      ['Bachelor of Science in Engineering in Civil Engineering', 420, 4],
      ['Bachelor of Science in Engineering in Electrical Engineering', 420, 4],
      ['Bachelor of Science in Engineering in Electrical and Computer Engineering', 420, 4],
      ['Bachelor of Science in Engineering in Mechatronics', 420, 4],
      ['Bachelor of Science in Engineering in Chemical Engineering', 420, 4],
      ['Bachelor of Science in Engineering in Mechanical Engineering', 420, 4],
      ['Bachelor of Science in Construction Studies', 390, 3], ['Bachelor of Science in Property Studies', 390, 3],
      ['Bachelor of Architectural Studies', 348, 3], ['Bachelor of Science in Geomatics', 390, 4],
      ['Bachelor of Medicine and Bachelor of Surgery', 450, 6], ['Bachelor of Science in Physiotherapy', 360, 4],
      ['Bachelor of Science in Occupational Therapy', 340, 4], ['Bachelor of Science in Audiology', 340, 4],
      ['Bachelor of Science in Speech-Language Pathology', 340, 4], ['Higher Certificate in Disability Practice', 300, 1],
      ['Bachelor of Arts', 380, 3], ['Bachelor of Social Science', 380, 3], ['Bachelor of Social Work', 380, 4],
      ['Bachelor of Social Science in Philosophy, Politics and Economics', 450, 3],
      ['Bachelor of Arts in Fine Art', 380, 4], ['Bachelor of Arts in Theatre and Performance', 380, 4],
      ['Bachelor of Arts specialising in Film and Media Production', 380, 3], ['Bachelor of Music', 380, 4],
      ['Diploma in Music Performance', 0, 3], ['Diploma in Theatre and Performance', 0, 3],
      ['Bachelor of Laws (LLB)', 470, 4], ['Bachelor of Science', 550, 3]
    ];
    for (const [name, apsScore, years] of uctProgrammes) {
      addProgramme({ name, duration: `${years} ${years === 1 ? 'year' : 'years'}`, apsScore });
    }
  }

  return programmes;
}

function titleCaseUppercaseName(name) {
  if (name !== name.toUpperCase()) return name;
  const connectors = new Set(['and', 'in', 'of', 'to']);
  return name.toLowerCase().split(/\s+/).map((word, index) => {
    if (index > 0 && connectors.has(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function isUsableProgramme(programme) {
  programme.name = titleCaseUppercaseName(programme.name)
    .replace(/\s*\[[1-7]\s*years?]\s*/gi, ' ')
    .replace(/\s*\[[1-7]\s*ears?]\s*/gi, ' ')
    .replace(/\s+(?:[3-7]\s+)*(?:1[8-9]|[2-4]\d)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bIct\b/g, 'ICT')
    .replace(/\bEducationand\b/g, 'Education and')
    .replace(/\bSpeech-\s+Language\b/g, 'Speech-Language')
    .replace(/^Bachelor of Science in Science \(BSc\) General$/i, 'Bachelor of Science (General)')
    .replace(/^Bachelor of Science (?!in\b|\()/i, 'Bachelor of Science in ')
    .replace(/^Bachelor of Commerce (?!in\b|with\b|$|\()/i, 'Bachelor of Commerce in ')
    .replace(/^Bachelor of Arts in \(Law\)(?:\s+\([^)]*\))?/i, 'Bachelor of Arts in Law')
    .replace(/\s+\(([34])yrs\)$/i, ' ($1-year programme)')
    .replace(/^Bachelor of Education (?!in\b|\()/i, 'Bachelor of Education in ')
    .trim();
  if (/^This (?:higher certificate|diploma|professional bachelor's|bachelor's programme)/i.test(programme.description)) {
    programme.description = programmeDescription(programme.name);
  }

  const allowedWithoutNumericScore = programme.apsScore === 0 && (
    (programme.universityName === 'University of KwaZulu-Natal' && /Medicine and Bachelor of Surgery/i.test(programme.name))
    || (programme.universityName === 'University of Cape Town' && /^Diploma in/i.test(programme.name))
  );
  const isUctScore = programme.universityName === 'University of Cape Town'
    && programme.apsScore >= 300 && programme.apsScore <= 600;
  if (!allowedWithoutNumericScore && !isUctScore && (programme.apsScore < 18 || programme.apsScore > 48)) return false;
  if (programme.apsScore > 42 && !['University of the Witwatersrand', 'University of Cape Town'].includes(programme.universityName)) return false;
  if (programme.name.length < 12 || programme.name.length > 135) return false;
  if (/\b(?:points?|years?|academic|SG|HG|curriculum \)|programme$|degree \(|degree$|honours)\b/i.test(programme.name)) return false;
  if (/[�%:]|\[\s*$|[&(/-]\s*$|(?:^|\s)\d+(?:\s|$)/.test(programme.name)) return false;
  if (/\b(?:Com|Comm|Scie|Scien|Inf|Info|Li|Lif|Mat|De|Environmen|T|Health|Occupational|Social|Intermediate|Urban|Construction|EXTE|a)\s*$/i.test(programme.name)) return false;
  if (/\b(?:Audition|Programm|PR Extended)\b/i.test(programme.name)) return false;
  if (/;|Degree majors|\bManage$/i.test(programme.name)) return false;
  if (/^Bachelor of Surgery$/i.test(programme.name)) return false;

  if (/laws|\blaw\b/i.test(programme.name)) programme.faculty = 'Law';
  else if (/education|teaching/i.test(programme.name)) programme.faculty = 'Education';
  else if (/engineering|architecture|architectural|construction|planning|property studies/i.test(programme.name)) programme.faculty = 'Engineering & Built Environment';
  else if (/health|medicine|medical|surgery|nursing|pharmacy|physio|dental|oral|dietetics|biokinetics|occupational therapy|social work|audiology|speech-language/i.test(programme.name)) programme.faculty = 'Health Sciences';
  else if (/social science|arts|music|philosophy/i.test(programme.name)) programme.faculty = 'Humanities';
  else if (/science|technology|agriculture|forestry|conservation|environment|mathematics|ICT|information/i.test(programme.name)) programme.faculty = 'Science & IT';
  else if (/administration|commerce|management|account|business|economic/i.test(programme.name)) programme.faculty = 'Commerce & Management';
  return true;
}

// Nelson Mandela University calls its admission measure the Applicant Score
// (AS). Its programme tables generally list separate AS values for Mathematics,
// Technical Mathematics and Mathematical Literacy. The legacy programme data
// stored the equivalent compact APS values, so convert them to the lowest AS
// published across those columns. A dash in every AS column means that the
// programme has no numeric school-leaving AS requirement.
function nelsonMandelaApplicantScore(programme) {
  if (programme.universityName !== 'Nelson Mandela University') return programme.apsScore;

  if (/^Diploma in (?:Economics|Marketing)$/i.test(programme.name)) {
    return 330;
  }

  if (/^PGCE:|Higher Certificate in Human Settlement Development/i.test(programme.name)) {
    return 0;
  }

  if (/Diploma in Interior Design/i.test(programme.name)) {
    return 315;
  }

  const lowestPublishedAsByLegacyScore = new Map([
    [20, 290],
    [22, 310],
    [23, 330],
    [24, 350],
    [26, 370],
    [27, 390],
    [29, 410],
    [30, 430],
  ]);

  return lowestPublishedAsByLegacyScore.get(programme.apsScore) ?? programme.apsScore;
}

// UCT's South African NSC requirements use the raw six-subject APS out of 600.
// Health Sciences explicitly calls this the sub-minimum APS; Humanities calls
// the equivalent unadjusted score the FPS (which equals APS in that faculty).
// Do not retain the 31-40 point values from the international-applicant table.
function universityOfCapeTownSubMinimumAps(programme) {
  if (programme.universityName !== 'University of Cape Town') return programme.apsScore;
  return programme.apsScore;
}

const additions = [];
const extractedFromMarkdown = [];
const markdownFiles = fs.readdirSync(markdownDirectory)
  .filter((name) => name.endsWith('_prospectus.md'))
  .sort();

for (const filename of markdownFiles) {
  const slug = filename.replace(/_prospectus\.md$/, '');
  const university = universityBySlug.get(slug);
  if (!university) {
    throw new Error(`No university-list entry found for ${filename}`);
  }
  const extracted = extractFromMarkdown(path.join(markdownDirectory, filename), university).filter(isUsableProgramme);
  extractedFromMarkdown.push(...extracted);
  process.stderr.write(`${filename}: ${extracted.length} extracted\n`);
  additions.push(...extracted);
}

const markdownByProgramme = new Map(
  extractedFromMarkdown.map((programme) => [
    `${programme.universityId}|${programmeKey(programme.name)}`,
    programme,
  ])
);
let refreshedFromMarkdown = 0;
const sourceManagedUniversities = new Set([
  'Rhodes University',
  'Tshwane University of Technology',
  'University of Cape Town',
  'University of Johannesburg',
  'University of the Free State',
  'University of Venda',
  'University of Zululand',
  'Vaal University of Technology',
]);
const retainedExisting = existing.filter((programme) => !sourceManagedUniversities.has(programme.universityName));
const refreshedExisting = retainedExisting.map((programme) => {
  const source = markdownByProgramme.get(`${programme.universityId}|${programmeKey(programme.name)}`);
  if (!source) return programme;
  refreshedFromMarkdown += 1;
  return {
    ...programme,
    faculty: source.faculty !== 'Not specified' ? source.faculty : programme.faculty,
    qualificationType: source.qualificationType,
    duration: source.duration !== 'See prospectus' ? source.duration : programme.duration,
    apsScore: source.apsScore,
    subjectRequirements: source.subjectRequirements.length
      ? source.subjectRequirements
      : programme.subjectRequirements,
  };
});
process.stderr.write(`${refreshedFromMarkdown} existing programmes refreshed from markdown\n`);

const refreshedKeys = new Set(
  refreshedExisting.map((programme) => `${programme.universityId}|${programmeKey(programme.name)}`)
);
const newFromMarkdown = additions.filter((programme) => {
  const key = `${programme.universityId}|${programmeKey(programme.name)}`;
  if (refreshedKeys.has(key)) return false;
  refreshedKeys.add(key);
  return true;
});
process.stderr.write(`${newFromMarkdown.length} missing programmes added from markdown\n`);

const merged = [...refreshedExisting, ...newFromMarkdown]
  .map((programme) => ({
    ...programme,
    apsScore: nelsonMandelaApplicantScore(programme),
  }))
  .map((programme) => ({
    ...programme,
    apsScore: universityOfCapeTownSubMinimumAps(programme),
  }))
  .map((programme) => ({
    ...programme,
    apsScore: Number.isFinite(programme.apsScore) ? programme.apsScore : 0,
  }))
  .map((programme) => {
    if (programme.duration !== 'See prospectus') return programme;
    const key = `${programme.universityName}|${programmeKey(programme.name)}`;
    const inferredDuration = /^Higher Certificate\b/i.test(programme.name) ? '1 year'
      : /^Diploma\b/i.test(programme.name) ? '3 years'
        : /Medicine and Bachelor of Surgery|MBChB/i.test(programme.name) ? '6 years'
          : /Extended|Education|Nursing|Pharmacy|Social Work|Engineering|Architecture|Health Sciences/i.test(programme.name) ? '4 years'
            : '3 years';
    return {
      ...programme,
      duration: markdownDurationOverrides.get(key) ?? inferredDuration,
    };
  })
  .filter((programme, index, allProgrammes) => allProgrammes.findIndex((candidate) =>
    candidate.universityId === programme.universityId && programmeKey(candidate.name) === programmeKey(programme.name)
  ) === index)
  .map((programme, index) => ({ ...programme, id: index + 1 }));

const unresolvedDurations = merged.filter((programme) => programme.duration === 'See prospectus');
if (unresolvedDurations.length) {
  throw new Error(
    `Missing markdown durations for: ${unresolvedDurations
      .map((programme) => `${programme.universityName} — ${programme.name}`)
      .join('; ')}`
  );
}

fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);

const counts = new Map();
for (const programme of merged) {
  counts.set(programme.universityName, (counts.get(programme.universityName) ?? 0) + 1);
}
const summaryLines = [];
for (const [name, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
  summaryLines.push(`${name}: ${count} ${count === 1 ? 'programme' : 'programmes'}`);
  process.stdout.write(`${name}: ${count}\n`);
}
summaryLines.push(`TOTAL: ${merged.length} programmes`);
fs.writeFileSync(
  path.join(root, 'src/app/shared/programme_extraction_summary.txt'),
  `${summaryLines.join('\n')}\n`
);
process.stdout.write(`TOTAL: ${merged.length}\n`);
