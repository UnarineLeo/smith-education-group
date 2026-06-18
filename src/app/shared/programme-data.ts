export interface SubjectRequirement {
  subject: string;
  /** NSC achievement level required for the subject, 1 (lowest) - 7 (highest) */
  level: number;
  compulsory: boolean;
}

export interface Programme {
  id: number;
  universityId: number;
  universityName: string;
  name: string;
  faculty: string;
  qualificationType: string;
  duration: string;
  apsScore: number;
  description: string;
  subjectRequirements: SubjectRequirement[];
  campus?: string;
}

export const FACULTIES: string[] = [
  'Commerce & Management',
  'Education',
  'Engineering & Built Environment',
  'Health Sciences',
  'Humanities',
  'Law',
  'Science & IT'
];

export const QUALIFICATION_TYPES: string[] = [
  'Higher Certificate',
  'Diploma',
  "Bachelor's Degree",
  "Bachelor's Degree (Professional)"
];

export const NSC_LEVEL_LABELS: Record<number, string> = {
  7: 'Level 7 (80-100%)',
  6: 'Level 6 (70-79%)',
  5: 'Level 5 (60-69%)',
  4: 'Level 4 (50-59%)',
  3: 'Level 3 (40-49%)',
  2: 'Level 2 (30-39%)',
  1: 'Level 1 (0-29%)'
};

export function getLevelLabel(level: number): string {
  return NSC_LEVEL_LABELS[level] ?? `Level ${level}`;
}
