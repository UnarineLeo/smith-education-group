export const universitySubjects = ['Statistics', 'Economics', 'Accounting', 'Informatics', 'Computer Science', 'Taxation'];
export const schoolSubjects = ['Physics', 'Maths', 'Economics', 'Life Science', 'Accounting'];
export const schoolGrades = Array.from({ length: 9 }, (_, index) => index + 4);

export const services = [
  { title: 'University Tutoring', icon: 'school-outline', text: 'Expert support for the modules that matter to you.', detail: 'Work through challenging concepts, practise module questions, and build a study plan around your university coursework.' },
  { title: 'School Tutoring', icon: 'school-outline', text: 'Personalised subject support for Grades 4–12.', detail: 'Build understanding in Maths, Physics, Economics, Life Science and Accounting, with lessons suited to the learner’s grade and curriculum. Confirm subject availability for your grade on enquiry.' },
  { title: 'Private Tutoring', icon: 'people-outline', text: 'One-on-one sessions tailored to your learning needs.', detail: 'Individual learning support shaped around your goals, pace, and areas of difficulty. Enquire about subject and tutor availability.' },
  { title: 'Revision Camps', icon: 'calendar-outline', text: 'Focused preparation. A more confident exam season.', detail: 'Structured revision covering core concepts, practice questions, and exam technique. Enquire about upcoming dates and subjects.' },
  { title: 'Academic Workshops', icon: 'bar-chart-outline', text: 'Build study skills that stay with you.', detail: 'Explore time management, effective note-taking, academic writing, and exam preparation in guided group sessions.' },
  { title: 'Recorded Learning Packages', icon: 'play-circle-outline', text: 'Revisit the lesson. Learn at your own pace.', detail: 'Register your interest in recorded lessons and supporting study materials for your module.' },
  { title: 'Learning & Development', icon: 'bulb-outline', text: 'More opportunities to learn and grow.', detail: 'Tell us about your academic and career goals to discuss your learning and development needs.' }
];
// Selected institutions for tutoring enquiries, not a university ranking.
export const universities = [
  { name: 'University of the Witwatersrand', short: 'Wits', image: 'assets/logos/wits.svg', province: 'Gauteng' },
  { name: 'University of Cape Town', short: 'UCT', image: 'assets/logos/uct.svg', province: 'Western Cape' },
  { name: 'Stellenbosch University', short: 'Stellies', image: 'assets/logos/su.svg', province: 'Western Cape' },
  { name: 'University of Pretoria', short: 'UP', image: 'assets/logos/up.png', province: 'Gauteng' },
  { name: 'Varsity College', short: 'Varsity College', image: '', province: 'Multiple provinces' }
].map(university => ({ ...university, modules: [...universitySubjects] }));
export interface UniversityModule {
  name: string;
  code: string | null;
  university: string;
  short: string;
  description: string;
}

// Codes are university-specific; populate them only when confirmed.
export const universityModules: UniversityModule[] = universities.flatMap(university =>
  university.modules.map(name => ({
    name,
    code: null,
    university: university.name,
    short: university.short,
    description: `Explore tutoring support for ${name}, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support.`
  }))
);

export interface Tutor {
  name: string;
  initials: string;
  subject: string;
  subjects: string;
  qualification: string;
  universities: string[];
}

// Use full university names for confirmed tutor university associations.
export const tutors: Tutor[] = [...new Set([...universitySubjects, ...schoolSubjects])].map(subject => ({
  name: `${subject} tutor`, initials: subject.slice(0, 2).toUpperCase(), subject,
  subjects: subject, qualification: 'Personalised academic support', universities: []
}));
// Learning benefits describe our approach without attributing invented endorsements.
export const stories = [
  { subject: 'Make sense of Statistics', course: 'Statistics', quote: 'Move beyond memorising formulas. Work through how to choose a method, interpret your results and explain your reasoning, with guided practice shaped around your module.' },
  { subject: 'See the story behind the numbers', course: 'Accounting', quote: 'Build your understanding from the first transaction to the financial statements. Explore how entries connect, practise clear workings and develop a systematic approach to checking your answers.' },
  { subject: 'Connect Economics to everyday life', course: 'Economics', quote: 'Explore the reasoning behind the graphs. Connect economic concepts to familiar situations and practise building clear, well-supported answers to coursework and examination questions.' },
  { subject: 'Build confidence in Maths', course: 'School Maths', quote: 'Break challenging questions into manageable steps. Strengthen your foundations, work through mistakes constructively and develop a practice routine that fits your grade and learning pace.' },
  { subject: 'Give Physics revision a clear direction', course: 'School Physics', quote: 'Turn theory into a practical problem-solving process. Use diagrams, identify the information that matters and check your units as you work through questions suited to your curriculum.' }
];
export const articles = [
  { title: '10 effective study tips for university success', category: 'Study Tips', image: 'study.jpg', intro: 'Small, consistent habits make your study time more purposeful.', paragraphs: ['Set one clear goal for each study session. Break larger assignments into manageable tasks, and use a weekly plan to spread the work.', 'Test yourself from memory before checking your notes. Explain a concept aloud, practise a question, or write down what you remember.', 'Space your revision across several days. Mix practice with short breaks, review the areas you find difficult, and ask for help when a concept remains unclear.'] },
  { title: 'How to prepare for your final exams', category: 'Exam Preparation', image: 'campus', intro: 'Give your revision a clear structure before exam season arrives.', paragraphs: ['Start with your official module outline and exam timetable. List the topics you need to revise and prioritise areas where you feel least confident.', 'Use permitted past papers and practice questions to identify gaps. Try some questions under timed conditions, then review your reasoning carefully.', 'Prepare what you need the day before each exam. Check the venue or online arrangements and leave time to rest.'] },
  { title: 'Understanding financial accounting', category: 'Module Guides', image: 'study.jpg', intro: 'Build a foundation before moving on to more complex questions.', paragraphs: ['Begin with the relationship between assets, liabilities, and equity. Identify what each transaction changes before deciding how to record it.', 'Work through a small example from the journal to the ledger and then to the financial statements. Keep your workings clear so you can trace mistakes.', 'Use the terminology and accounting standards prescribed by your module. Bring specific questions to your lecturer or tutor.'] },
  { title: 'Managing your time as a university student', category: 'University Life', image: 'campus', intro: 'Make room for study, deadlines, and life beyond the classroom.', paragraphs: ['Put your fixed commitments into a weekly calendar, then add realistic study blocks. Include travel, meals, and rest.', 'Choose a small number of priorities each day. Leave some spare time for tasks that take longer than expected.', 'Review the plan at the end of the week. Adjust the workload instead of treating an unfinished task as a failure.'] },
  { title: 'Common mistakes to avoid in exams', category: 'Exam Preparation', image: 'study.jpg', intro: 'A careful approach can help you show what you know.', paragraphs: ['Read the instructions before starting and note the mark allocation. Budget your time across questions.', 'Show your reasoning clearly and check that you have answered the question being asked. Include units and labels where needed.', 'If time allows, review your answers for missing steps and simple calculation errors.'] },
  { title: 'Building your personal study toolkit', category: 'Study Tips', image: 'campus', intro: 'A few well-chosen resources can support a consistent routine.', paragraphs: ['Start with your prescribed materials and official university learning platform. Organise notes by module and topic.', 'Keep a list of questions, a revision timetable, and a record of practice problems. These can be paper-based or digital.', 'Check unfamiliar information against your course materials and ask your lecturer about reliable supplementary resources.'] }
];
