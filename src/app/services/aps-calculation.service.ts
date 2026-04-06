import { Injectable } from '@angular/core';
import { University } from '../shared/app-data';

export interface ApsSubjectInput {
  subject: string;
  mark: number;
}

export type UniversityApsRule =
  | 'best-six-excluding-lo'
  | 'best-six-including-lo'
  | 'best-six-eight-level-excluding-lo'
  | 'best-six-eight-level-including-lo'
  | 'best-six-eight-level-including-lo-capped'
  | 'sum-best-six-percent-excluding-lo'
  | 'divide-by-10-best-six-percent-excluding-lo'
  | 'average-best-six-percent-excluding-lo'
  | 'ump-seven-with-half-lo'
  | 'wits-custom'
  | 'uwc-weighted-seven-subject';

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
    1: 'divide-by-10-best-six-percent-excluding-lo',
    2: 'best-six-eight-level-including-lo-capped',
    3: 'best-six-eight-level-excluding-lo',
    4: 'best-six-eight-level-excluding-lo',
    5: 'sum-best-six-percent-excluding-lo',
    6: 'best-six-excluding-lo',
    7: 'divide-by-10-best-six-percent-excluding-lo',
    8: 'best-six-including-lo',
    9: 'best-six-eight-level-excluding-lo',
    10: 'average-best-six-percent-excluding-lo',
    11: 'best-six-eight-level-excluding-lo',
    12: 'sum-best-six-percent-excluding-lo',
    13: 'best-six-excluding-lo',
    14: 'best-six-eight-level-including-lo-capped',
    15: 'best-six-excluding-lo',
    16: 'best-six-excluding-lo',
    17: 'best-six-excluding-lo',
    18: 'ump-seven-with-half-lo',
    19: 'best-six-excluding-lo',
    20: 'best-six-including-lo',
    21: 'best-six-excluding-lo',
    22: 'uwc-weighted-seven-subject',
    23: 'wits-custom',
    24: 'best-six-excluding-lo',
    25: 'best-six-excluding-lo',
    26: 'best-six-excluding-lo'
  };

  private readonly universityRulesByName: Record<string, UniversityApsRule> = {
    'cape peninsula university of technology': 'divide-by-10-best-six-percent-excluding-lo',
    'central university of technology': 'best-six-eight-level-including-lo-capped',
    'durban university of technology': 'best-six-eight-level-excluding-lo',
    'mangosuthu university of technology': 'best-six-eight-level-excluding-lo',
    'nelson mandela university': 'sum-best-six-percent-excluding-lo',
    'north-west university': 'best-six-excluding-lo',
    'rhodes university': 'divide-by-10-best-six-percent-excluding-lo',
    'sefako makgatho health sciences university': 'best-six-including-lo',
    'sol plaatje university': 'best-six-eight-level-excluding-lo',
    'stellenbosch university': 'average-best-six-percent-excluding-lo',
    'tshwane university of technology': 'best-six-eight-level-excluding-lo',
    'university of cape town': 'sum-best-six-percent-excluding-lo',
    'university of fort hare': 'best-six-excluding-lo',
    'university of the free state': 'best-six-eight-level-including-lo-capped',
    'university of johannesburg': 'best-six-excluding-lo',
    'university of kwazulu-natal': 'best-six-excluding-lo',
    'university of limpopo': 'best-six-excluding-lo',
    'university of mpumalanga': 'ump-seven-with-half-lo',
    'university of pretoria': 'best-six-excluding-lo',
    'university of south africa': 'best-six-including-lo',
    'university of venda': 'best-six-excluding-lo',
    'university of the western cape': 'uwc-weighted-seven-subject',
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
      case 'best-six-including-lo':
        return this.calculateBestSixIncludingLifeOrientation(details.id, details.name, normalizedSubjects);
      case 'best-six-eight-level-excluding-lo':
        return this.calculateBestSixEightLevelExcludingLifeOrientation(details.id, details.name, normalizedSubjects);
      case 'best-six-eight-level-including-lo':
        return this.calculateBestSixEightLevelIncludingLifeOrientation(details.id, details.name, normalizedSubjects);
      case 'best-six-eight-level-including-lo-capped':
        return this.calculateBestSixEightLevelIncludingLifeOrientationCapped(details.id, details.name, normalizedSubjects);
      case 'sum-best-six-percent-excluding-lo':
        return this.calculateSumBestSixPercentExcludingLifeOrientation(details.id, details.name, normalizedSubjects);
      case 'divide-by-10-best-six-percent-excluding-lo':
        return this.calculateDivideByTenBestSixPercentExcludingLifeOrientation(details.id, details.name, normalizedSubjects);
      case 'average-best-six-percent-excluding-lo':
        return this.calculateAverageBestSixPercentExcludingLifeOrientation(details.id, details.name, normalizedSubjects);
      case 'ump-seven-with-half-lo':
        return this.calculateUmp(details.id, details.name, normalizedSubjects);
      case 'wits-custom':
        return this.calculateWits(details.id, details.name, normalizedSubjects);
      case 'uwc-weighted-seven-subject':
        return this.calculateUwcWeightedSevenSubject(details.id, details.name, normalizedSubjects);
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

  private calculateBestSixIncludingLifeOrientation(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const scored = this.scoreSubjectsWithNscScale(subjects);
    const selected = scored
      .sort((a, b) => b.points - a.points)
      .slice(0, 6)
      .map((subject) => subject.subject);

    const breakdown = scored.map((subject) => ({
      ...subject,
      used: selected.includes(subject.subject)
    }));

    return {
      universityId,
      universityName,
      rule: 'best-six-including-lo',
      score: breakdown.filter((subject) => subject.used).reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 42,
      breakdown,
      notes: [
        'Calculated with NSC 7-point levels using the best 6 subjects (Life Orientation may be included).'
      ]
    };
  }

  private calculateBestSixEightLevelExcludingLifeOrientation(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const scored = this.scoreSubjectsWithEightLevelScale(subjects);
    const selected = scored
      .filter((subject) => !this.isLifeOrientation(subject.subject))
      .sort((a, b) => b.points - a.points)
      .slice(0, 6)
      .map((subject) => subject.subject);

    const breakdown = scored.map((subject) => ({
      ...subject,
      used: selected.includes(subject.subject),
      note: this.isLifeOrientation(subject.subject) ? 'Excluded: Life Orientation' : undefined
    }));

    return {
      universityId,
      universityName,
      rule: 'best-six-eight-level-excluding-lo',
      score: breakdown.filter((subject) => subject.used).reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 48,
      breakdown,
      notes: [
        'Calculated with an 8-level APS scale using the best 6 subjects excluding Life Orientation.'
      ]
    };
  }

  private calculateBestSixEightLevelIncludingLifeOrientation(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const scored = this.scoreSubjectsWithEightLevelScale(subjects);
    const selected = scored
      .sort((a, b) => b.points - a.points)
      .slice(0, 6)
      .map((subject) => subject.subject);

    const breakdown = scored.map((subject) => ({
      ...subject,
      used: selected.includes(subject.subject)
    }));

    return {
      universityId,
      universityName,
      rule: 'best-six-eight-level-including-lo',
      score: breakdown.filter((subject) => subject.used).reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 48,
      breakdown,
      notes: [
        'Calculated with an 8-level APS scale using the best 6 subjects (Life Orientation may be included).'
      ]
    };
  }

  private calculateBestSixEightLevelIncludingLifeOrientationCapped(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const isFreeState = this.subjectKey(universityName) === 'university of the free state';
    const minimumLoMark = isFreeState ? 60 : 50;

    const scored = subjects.map((subject) => {
      const base = this.toEightLevelPoints(subject.mark);

      if (!this.isLifeOrientation(subject.subject)) {
        return {
          subject: subject.subject,
          mark: subject.mark,
          points: base,
          used: false,
          note: undefined as string | undefined
        };
      }

      const loQualified = subject.mark >= minimumLoMark;
      return {
        subject: subject.subject,
        mark: subject.mark,
        points: loQualified ? 1 : 0,
        used: false,
        note: loQualified
          ? `Life Orientation is capped at 1 point for ${isFreeState ? 'UFS' : 'CUT'}.`
          : `Life Orientation below ${minimumLoMark}% contributes 0 points for ${isFreeState ? 'UFS' : 'CUT'}.`
      };
    });

    const selected = scored
      .sort((a, b) => b.points - a.points)
      .slice(0, 6)
      .map((subject) => subject.subject);

    const breakdown = scored.map((subject) => ({
      ...subject,
      used: selected.includes(subject.subject)
    }));

    return {
      universityId,
      universityName,
      rule: 'best-six-eight-level-including-lo-capped',
      score: breakdown.filter((subject) => subject.used).reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 48,
      breakdown,
      notes: [
        `Calculated with an 8-level APS scale using best 6 subjects including Life Orientation. LO is capped at 1 point and requires at least ${minimumLoMark}%.`
      ]
    };
  }

  private calculateSumBestSixPercentExcludingLifeOrientation(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const selected = subjects
      .filter((subject) => !this.isLifeOrientation(subject.subject))
      .sort((a, b) => b.mark - a.mark)
      .slice(0, 6);

    const breakdown = subjects.map((subject) => ({
      subject: subject.subject,
      mark: subject.mark,
      points: subject.mark,
      used: selected.some((item) => this.subjectKey(item.subject) === this.subjectKey(subject.subject)),
      note: this.isLifeOrientation(subject.subject) ? 'Excluded: Life Orientation' : undefined
    }));

    return {
      universityId,
      universityName,
      rule: 'sum-best-six-percent-excluding-lo',
      score: selected.reduce((sum, subject) => sum + subject.mark, 0),
      maxScore: 600,
      breakdown,
      notes: [
        'Calculated as the sum of the best 6 subject percentages excluding Life Orientation.'
      ]
    };
  }

  private calculateDivideByTenBestSixPercentExcludingLifeOrientation(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const sumResult = this.calculateSumBestSixPercentExcludingLifeOrientation(universityId, universityName, subjects);
    const dividedScore = sumResult.score === null ? null : Number((sumResult.score / 10).toFixed(1));

    return {
      ...sumResult,
      rule: 'divide-by-10-best-six-percent-excluding-lo',
      score: dividedScore,
      maxScore: 60,
      notes: [
        'Calculated as the sum of best 6 subject percentages excluding Life Orientation, divided by 10.'
      ]
    };
  }

  private calculateAverageBestSixPercentExcludingLifeOrientation(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const selected = subjects
      .filter((subject) => !this.isLifeOrientation(subject.subject))
      .sort((a, b) => b.mark - a.mark)
      .slice(0, 6);

    const average = selected.length
      ? Number((selected.reduce((sum, subject) => sum + subject.mark, 0) / selected.length).toFixed(2))
      : null;

    const breakdown = subjects.map((subject) => ({
      subject: subject.subject,
      mark: subject.mark,
      points: subject.mark,
      used: selected.some((item) => this.subjectKey(item.subject) === this.subjectKey(subject.subject)),
      note: this.isLifeOrientation(subject.subject) ? 'Excluded: Life Orientation' : undefined
    }));

    return {
      universityId,
      universityName,
      rule: 'average-best-six-percent-excluding-lo',
      score: average,
      maxScore: 100,
      breakdown,
      notes: [
        'Calculated as the average percentage across the best 6 subjects excluding Life Orientation.'
      ]
    };
  }

  private calculateUwcWeightedSevenSubject(
    universityId: number | null,
    universityName: string,
    subjects: ApsSubjectInput[]
  ): ApsCalculationResult {
    const scored = subjects.map((subject) => {
      if (this.isLifeOrientation(subject.subject)) {
        return {
          subject: subject.subject,
          mark: subject.mark,
          points: this.toUwcLifeOrientationPoints(subject.mark),
          note: 'UWC weighting: Life Orientation scale'
        };
      }

      if (this.isEnglish(subject.subject) || this.isMaths(subject.subject)) {
        return {
          subject: subject.subject,
          mark: subject.mark,
          points: this.toUwcCorePoints(subject.mark),
          note: 'UWC weighting: Core subject scale for English/Mathematics'
        };
      }

      return {
        subject: subject.subject,
        mark: subject.mark,
        points: this.toUwcOtherPoints(subject.mark)
      };
    });

    const english = this.pickBest(scored, (subject) => this.isEnglish(subject.subject));
    const maths = this.pickBest(scored, (subject) => this.isMaths(subject.subject));
    const lo = this.pickBest(scored, (subject) => this.isLifeOrientation(subject.subject));

    const selected: Array<typeof scored[number]> = [];
    const usedKeys = new Set<string>();

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

    const remaining = scored
      .filter((subject) => !usedKeys.has(this.subjectKey(subject.subject)))
      .sort((a, b) => b.points - a.points)
      .slice(0, Math.max(0, 7 - selected.length));

    selected.push(...remaining);

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
      rule: 'uwc-weighted-seven-subject',
      score: selected.reduce((sum, subject) => sum + subject.points, 0),
      maxScore: 65,
      breakdown,
      notes: [
        'Calculated using UWC weighted 7-subject scale (English/Mathematics weighted, Life Orientation included).'
      ]
    };
  }

  private toUwcCorePoints(mark: number): number {
    if (mark >= 90) {
      return 15;
    }

    if (mark >= 80) {
      return 13;
    }

    if (mark >= 70) {
      return 11;
    }

    if (mark >= 60) {
      return 9;
    }

    if (mark >= 50) {
      return 7;
    }

    if (mark >= 40) {
      return 5;
    }

    if (mark >= 30) {
      return 3;
    }

    if (mark >= 20) {
      return 1;
    }

    return 0;
  }

  private toUwcOtherPoints(mark: number): number {
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

    if (mark >= 20) {
      return 1;
    }

    return 0;
  }

  private toUwcLifeOrientationPoints(mark: number): number {
    if (mark >= 80) {
      return 3;
    }

    if (mark >= 50) {
      return 2;
    }

    if (mark >= 20) {
      return 1;
    }

    return 0;
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
