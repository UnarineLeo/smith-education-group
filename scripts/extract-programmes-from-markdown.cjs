const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const markdownDirectory = path.join(root, 'src/assets/markdown');
const outputPath = path.join(root, 'src/app/shared/programme-list.json');
const baselinePath = path.join(root, 'src/assets/programme-list.json');
const universityPath = path.join(root, 'src/app/university-list/university-list.json');

const universities = JSON.parse(fs.readFileSync(universityPath, 'utf8'));
const existing = JSON.parse(fs.readFileSync(
  fs.existsSync(baselinePath) ? baselinePath : outputPath,
  'utf8'
));
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
  return match ? `${match[1].replace(/\s+/g, '')} ${/^yr$/i.test(match[2]) ? 'year' : match[2]}` : 'See prospectus';
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
    .replace(/^Bachelor of Education (?!in\b)/i, 'Bachelor of Education in ')
    .trim();
  if (/^This (?:higher certificate|diploma|professional bachelor's|bachelor's programme)/i.test(programme.description)) {
    programme.description = programmeDescription(programme.name);
  }

  if (programme.apsScore < 18 || programme.apsScore > 48) return false;
  if (programme.apsScore > 42 && programme.universityName !== 'University of the Witwatersrand') return false;
  if (programme.name.length < 12 || programme.name.length > 135) return false;
  if (/\b(?:points?|years?|academic|SG|HG|curriculum \)|programme$|degree \(|degree$|honours)\b/i.test(programme.name)) return false;
  if (/[�%:]|\[\s*$|[&(/-]\s*$|(?:^|\s)\d+(?:\s|$)/.test(programme.name)) return false;
  if (/\b(?:Com|Comm|Scie|Scien|Inf|Info|Li|Lif|Mat|De|Environmen|T|Health|Occupational|Social|Intermediate|Urban|Construction|EXTE|a)\s*$/i.test(programme.name)) return false;
  if (/\b(?:Audition|Programm|PR Extended|Computer Science and Informatics)\b/i.test(programme.name)) return false;
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

const additions = [];
const markdownFiles = fs.readdirSync(markdownDirectory)
  .filter((name) => name.endsWith('_prospectus.md'))
  .sort();

for (const filename of markdownFiles) {
  const slug = filename.replace(/_prospectus\.md$/, '');
  const university = universityBySlug.get(slug);
  if (!university) {
    throw new Error(`No university-list entry found for ${filename}`);
  }
  if (existingUniversityIds.has(university.id)) continue;
  additions.push(...extractFromMarkdown(path.join(markdownDirectory, filename), university).filter(isUsableProgramme));
}

const merged = [...existing, ...additions]
  .map((programme) => {
    if (programme.duration !== 'See prospectus') return programme;
    const key = `${programme.universityName}|${programmeKey(programme.name)}`;
    return {
      ...programme,
      duration: markdownDurationOverrides.get(key) ?? programme.duration,
    };
  })
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
