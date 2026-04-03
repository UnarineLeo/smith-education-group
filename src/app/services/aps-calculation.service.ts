import { Injectable } from '@angular/core';
import { University } from '../shared/app-data';

export interface ApsSubjectInput {
  subject: string;
  mark: number;
}

export type UniversityApsRule =
  | 'best-six-excluding-lo'
  | 'uct-fps-adjusted'
  | 'ukzn-max-48'
  | 'ump-seven-with-half-lo'
  | 'wits-custom'
  | 'aggregate-excluding-lo';

export interface ApsCalculationBreakdown {
  subject: string;
  mark: number;
  points: number;
  used: boolean;
  note?: string;
}

export interface ApsCalculationResult {
  universityId: number | null;
  universityName: string;
  rule: UniversityApsRule;
  score: number | null;
  maxScore: number | null;
  breakdown: ApsCalculationBreakdown[];
  notes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ApsCalculationService {
  private readonly universityRulesById: Record<number, UniversityApsRule> = {
    1: 'best-six-excluding-lo',
    2: 'best-six-excluding-lo',
    3: 'best-six-excluding-lo',
    4: 'best-six-excluding-lo',
    5: 'best-six-excluding-lo',
    6: 'best-six-excluding-lo',
    7: 'best-six-excluding-lo',
    8: 'best-six-excluding-lo',
    9: 'best-six-excluding-lo',
    10: 'aggregate-excluding-lo',
    11: 'best-six-excluding-lo',
    12: 'uct-fps-adjusted',
    13: 'best-six-excluding-lo',
    14: 'best-six-excluding-lo',
    15: 'best-six-excluding-lo',
    16: 'ukzn-max-48',
    17: 'best-six-excluding-lo',
    18: 'ump-seven-with-half-lo',
    19: 'best-six-excluding-lo',
    20: 'best-six-excluding-lo',
    21: 'best-six-excluding-lo',
    22: 'best-six-excluding-lo',
    23: 'wits-custom',
    24: 'best-six-excluding-lo',
    25: 'best-six-excluding-lo',
    26: 'best-six-excluding-lo'
  };

  private readonly universityRulesByName: Record<string, UniversityApsRule> = {
    'cape peninsula university of technology': 'best-six-excluding-lo',
    'central university of technology': 'best-six-excluding-lo',
    'durban university of technology': 'best-six-excluding-lo',
    'mangosuthu university of technology': 'best-six-excluding-lo',
    'nelson mandela university': 'best-six-excluding-lo',
    'north-west university': 'best-six-excluding-lo',
    'rhodes university': 'best-six-excluding-lo',
    'sefako makgatho health sciences university': 'best-six-excluding-lo',
    'sol plaatje university': 'best-six-excluding-lo',
    'stellenbosch university': 'aggregate-excluding-lo',
    'tshwane university of technology': 'best-six-excluding-lo',
    'university of cape town': 'uct-fps-adjusted',
    'university of fort hare': 'best-six-excluding-lo',
    'university of the free state': 'best-six-excluding-lo',
    'university of johannesburg': 'best-six-excluding-lo',
    'university of kwazulu-natal': 'ukzn-max-48',
    'university of limpopo': 'best-six-excluding-lo',
    'university of mpumalanga': 'ump-seven-with-half-lo',
    'university of pretoria': 'best-six-excluding-lo',
    'university of south africa': 'best-six-excluding-lo',
    'university of venda': 'best-six-excluding-lo',
    'university of the western cape': 'best-six-excluding-lo',
    'university of the witwatersrand': 'wits-custom',
    'university of zululand': 'best-six-excluding-lo',
    'vaal university of technology': 'best-six-excluding-lo',
    'walter sisulu university': 'best-six-excluding-lo'
  };

  calculateForUniversity(university: Pick<University, 'id' | 'name'> | number | string, subjects: ApsSubjectInput[]): ApsCalculationResult {
    const normalizedSubjects = this.normalizeSubjects(subjects);
    const details = this.resolveUniversity(university);

    switch (details.rule) {
      case 'best-six-excluding-lo':
        return this.calculateBestSixExcludingLifeOrientation(details.id, details.name, normalizedSubjects);
      case 'uct-fps-adjusted':
        return this.calculateUctFpsAdjusted(details.id, details.name, normalizedSubjects);
      case 'ukzn-max-48':
        return this.calculateUkzn(details.id, details.name, normalizedSubjects);
      case 'ump-seven-with-half-lo':
        return this.calculateUmp(details.id, details.name, normalizedSubjects);
      case 'wits-custom':
        return this.calculateWits(details.id, details.name, normalizedSubjects);
      case 'aggregate-excluding-lo':
        return this.calculateAggregateExcludingLifeOrientation(details.id, details.name, normalizedSubjects);
      default:
        return this.calculateBestSixExcludingLifeOrientation(details.id, details.name, normalizedSubjects);
    }
  }

  getUniversityRule(university: Pick<University, 'id' | 'name'> | number | string): UniversityApsRule {
    return this.resolveUniversity(university).rule;
  }

  private resolveUniversity(university: Pick<University, 'id' | 'name'> | number | string): { id: number | null; name: string; rule: UniversityApsRule } {
    if (typeof university === 'number') {
      return {
        id: university,
        name: `University ${university}`,
        rule: this.universityRulesById[university] ?? 'best-six-excluding-lo'
      };
    }

    if (typeof university === 'string') {
      const key = university.trim().toLowerCase();
      return {
        id: null,
        name: university,
        rule: this.universityRulesByName[key] ?? 'best-six-excluding-lo'
      };
    }

    const byId = this.universityRulesById[university.id];
    const byName = this.universityRulesByName[university.name.trim().toLowerCase()];

    return {
      id: university.id,
      name: university.name,
      rule: byId ?? byName ?? 'best-six-excluding-lo'
    };
  }

  private calculateBestSixExcludingLifeOrientation(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const scored = this.scoreSubjectsWithNscScale(subjects);
    const chosen = scored
      .filter((subject) => !this.isLifeOrientation(subject.subject))
      .sort((a, b) => b.points - a.points)
      .slice(0, 6)
      .map((subject) => subject.subject);

    const breakdown = scored.map((subject) => ({
      ...subject,
      used: chosen.includes(subject.subject),
      note: this.isLifeOrientation(subject.subject) ? 'Excluded: Life Orientation' : undefined
    }));

    return {
      universityId,
      universityName,
      rule: 'best-six-excluding-lo',
      score: breakdown.filter((subject) => subject.used).reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 42,
      breakdown,
      notes: [
        'Calculated with NSC 7-point levels using the best 6 subjects excluding Life Orientation.'
      ]
    };
  }

  private calculateUctFpsAdjusted(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const bestSix = this.calculateBestSixExcludingLifeOrientation(universityId, universityName, subjects);

    const english = subjects
      .filter((subject) => this.isEnglish(subject.subject) && !this.isLifeOrientation(subject.subject))
      .sort((a, b) => b.mark - a.mark)[0];

    const otherSubjects = subjects
      .filter((subject) => !this.isLifeOrientation(subject.subject) && (!english || subject.subject !== english.subject))
      .sort((a, b) => b.mark - a.mark)
      .slice(0, 5);

    const fpsProxy = english ? english.mark + otherSubjects.reduce((sum, subject) => sum + subject.mark, 0) : null;

    return {
      ...bestSix,
      rule: 'uct-fps-adjusted',
      notes: [
        `Baseline APS (best 6 excluding LO): ${bestSix.score ?? 'N/A'}`,
        `FPS proxy (English + best 5 others, % total out of 600): ${fpsProxy ?? 'N/A'}`,
        'Final UCT FPS/WPS depends on faculty-specific adjustments and NBT/disadvantage factors.'
      ]
    };
  }

  private calculateUkzn(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const scored = this.scoreSubjectsWithEightLevelScale(subjects);
    const pool = scored.filter((subject) => !this.isLifeOrientation(subject.subject));

    const english = this.pickBest(pool, (subject) => this.isEnglish(subject.subject));
    const maths = this.pickBest(pool, (subject) => this.isMaths(subject.subject));

    const usedKeys = new Set<string>();
    const selected: Array<typeof scored[number]> = [];

    if (english) {
      selected.push(english);
      usedKeys.add(this.subjectKey(english.subject));
    }

    if (maths && !usedKeys.has(this.subjectKey(maths.subject))) {
      selected.push(maths);
      usedKeys.add(this.subjectKey(maths.subject));
    }

    const others = pool
      .filter((subject) => !usedKeys.has(this.subjectKey(subject.subject)))
      .sort((a, b) => b.points - a.points)
      .slice(0, 6 - selected.length);

    selected.push(...others);

    const breakdown = scored.map((subject) => ({
      ...subject,
      used: selected.some((item) => this.subjectKey(item.subject) === this.subjectKey(subject.subject)),
      note: this.isLifeOrientation(subject.subject) ? 'Excluded: Life Orientation' : undefined
    }));

    return {
      universityId,
      universityName,
      rule: 'ukzn-max-48',
      score: selected.reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 48,
      breakdown,
      notes: [
        'Calculated on UKZN 8-level scale (max 48).',
        'Rule applied: English + Mathematics/Maths Literacy + best remaining subjects, excluding LO.'
      ]
    };
  }

  private calculateUmp(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const scored = this.scoreSubjectsWithNscScale(subjects);
    const sorted = scored.sort((a, b) => b.mark - a.mark).slice(0, 7);

    const breakdown = scored.map((subject) => {
      const used = sorted.some((item) => this.subjectKey(item.subject) === this.subjectKey(subject.subject));
      const adjusted = this.isLifeOrientation(subject.subject) ? subject.points / 2 : subject.points;
      return {
        ...subject,
        used,
        points: adjusted,
        note: this.isLifeOrientation(subject.subject) ? 'Life Orientation weighted at 50%' : undefined
      };
    });

    return {
      universityId,
      universityName,
      rule: 'ump-seven-with-half-lo',
      score: breakdown.filter((subject) => subject.used).reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 45.5,
      breakdown,
      notes: [
        'Calculated from 7 prescribed subjects.',
        'Life Orientation is included at half of the normal achievement level.'
      ]
    };
  }

  private calculateWits(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    type WitsScoredSubject = {
      subject: string;
      mark: number;
      points: number;
      note?: string;
    };

    const scored: WitsScoredSubject[] = subjects.map((subject) => {
      const base = this.toEightLevelPoints(subject.mark);
      if (this.isEnglish(subject.subject) || this.isMaths(subject.subject)) {
        return { ...subject, points: base + 2, note: 'Wits weighting: +2 for English/Mathematics' };
      }

      if (this.isLifeOrientation(subject.subject)) {
        return { ...subject, points: this.toWitsLifeOrientationPoints(subject.mark), note: 'Wits weighting: Life Orientation scale' };
      }

      return { ...subject, points: base };
    });

    const english = this.pickBest(scored, (subject) => this.isEnglish(subject.subject));
    const maths = this.pickBest(scored, (subject) => this.isMaths(subject.subject));
    const lo = this.pickBest(scored, (subject) => this.isLifeOrientation(subject.subject));

    const usedKeys = new Set<string>();
    const selected: Array<typeof scored[number]> = [];

    if (english) {
      selected.push(english);
      usedKeys.add(this.subjectKey(english.subject));
    }

    if (maths && !usedKeys.has(this.subjectKey(maths.subject))) {
      selected.push(maths);
      usedKeys.add(this.subjectKey(maths.subject));
    }

    if (lo && !usedKeys.has(this.subjectKey(lo.subject))) {
      selected.push(lo);
      usedKeys.add(this.subjectKey(lo.subject));
    }

    const others = scored
      .filter((subject) => !usedKeys.has(this.subjectKey(subject.subject)) && !this.isLifeOrientation(subject.subject))
      .sort((a, b) => b.points - a.points)
      .slice(0, 7 - selected.length);

    selected.push(...others);

    const breakdown = scored.map((subject) => ({
      subject: subject.subject,
      mark: subject.mark,
      points: subject.points,
      used: selected.some((item) => this.subjectKey(item.subject) === this.subjectKey(subject.subject)),
      note: subject.note
    }));

    return {
      universityId,
      universityName,
      rule: 'wits-custom',
      score: selected.reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 56,
      breakdown,
      notes: [
        'Calculated with the Wits custom APS weighting model.',
        'English/Mathematics receive additional weighting; Life Orientation uses Wits-specific points.'
      ]
    };
  }

  private calculateAggregateExcludingLifeOrientation(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const pool = subjects
      .filter((subject) => !this.isLifeOrientation(subject.subject))
      .sort((a, b) => b.mark - a.mark)
      .slice(0, 6);

    const sum = pool.reduce((total, subject) => total + subject.mark, 0);
    const aggregate = pool.length ? Number((sum / pool.length).toFixed(2)) : null;

    const breakdown = subjects.map((subject) => ({
      subject: subject.subject,
      mark: subject.mark,
      points: subject.mark,
      used: pool.some((item) => this.subjectKey(item.subject) === this.subjectKey(subject.subject)),
      note: this.isLifeOrientation(subject.subject) ? 'Excluded: Life Orientation' : undefined
    }));

    return {
      universityId,
      universityName,
      rule: 'aggregate-excluding-lo',
      score: aggregate,
      maxScore: 100,
      breakdown,
      notes: [
        'Aggregate percentage based on best 6 subjects excluding LO.'
      ]
    };
  }

  private normalizeSubjects(subjects: ApsSubjectInput[]): ApsSubjectInput[] {
    return subjects
      .map((subject) => ({
        subject: subject.subject?.trim() ?? '',
        mark: Number(subject.mark)
      }))
      .filter((subject) => subject.subject !== '' && Number.isFinite(subject.mark) && subject.mark >= 0 && subject.mark <= 100);
  }

  private scoreSubjectsWithNscScale(subjects: ApsSubjectInput[]): ApsCalculationBreakdown[] {
    return subjects.map((subject) => ({
      ...subject,
      points: this.toNscPoints(subject.mark),
      used: false
    }));
  }

  private scoreSubjectsWithEightLevelScale(subjects: ApsSubjectInput[]): ApsCalculationBreakdown[] {
    return subjects.map((subject) => ({
      ...subject,
      points: this.toEightLevelPoints(subject.mark),
      used: false
    }));
  }

  private toNscPoints(mark: number): number {
    if (mark >= 80) {
      return 7;
    }

    if (mark >= 70) {
      return 6;
    }

    if (mark >= 60) {
      return 5;
    }

    if (mark >= 50) {
      return 4;
    }

    if (mark >= 40) {
      return 3;
    }

    if (mark >= 30) {
      return 2;
    }

    return 1;
  }

  private toEightLevelPoints(mark: number): number {
    if (mark >= 90) {
      return 8;
    }

    if (mark >= 80) {
      return 7;
    }

    if (mark >= 70) {
      return 6;
    }

    if (mark >= 60) {
      return 5;
    }

    if (mark >= 50) {
      return 4;
    }

    if (mark >= 40) {
      return 3;
    }

    if (mark >= 30) {
      return 2;
    }

    return 1;
  }

  private toWitsLifeOrientationPoints(mark: number): number {
    if (mark >= 90) {
      return 4;
    }

    if (mark >= 80) {
      return 3;
    }

    if (mark >= 70) {
      return 2;
    }

    if (mark >= 60) {
      return 1;
    }

    return 0;
  }

  private isLifeOrientation(subject: string): boolean {
    const key = this.subjectKey(subject);
    return key === 'life orientation' || key === 'lo';
  }

  private isEnglish(subject: string): boolean {
    return this.subjectKey(subject).includes('english');
  }

  private isMaths(subject: string): boolean {
    const key = this.subjectKey(subject);
    return key.includes('math') || key.includes('mathematical literacy');
  }

  private subjectKey(subject: string): string {
    return subject.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private pickBest<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
    return items.filter(predicate)[0];
  }
}
