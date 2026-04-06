/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';

import { ApsCalculationService, ApsSubjectInput } from './aps-calculation.service';

describe('ApsCalculationService', () => {
  let service: ApsCalculationService;

  const subjects: ApsSubjectInput[] = [
    { subject: 'English HL', mark: 85 },
    { subject: 'Mathematics', mark: 78 },
    { subject: 'Life Orientation', mark: 92 },
    { subject: 'Physical Sciences', mark: 74 },
    { subject: 'Life Sciences', mark: 68 },
    { subject: 'Xitsonga HL', mark: 66 },
    { subject: 'Geography', mark: 59 },
    { subject: 'History', mark: 52 },
    { subject: 'Accounting', mark: 47 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApsCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate best-six-excluding-lo rule', () => {
    const result = service.calculateForUniversity(6, subjects);

    expect(result.rule).toBe('best-six-excluding-lo');
    expect(result.score).toBe(33);
    expect(result.maxScore).toBe(42);

    const lo = result.breakdown.find((item) => item.subject === 'Life Orientation');
    expect(lo?.used).toBeFalse();
    expect(lo?.note).toContain('Excluded');
  });

  it('should calculate sum-best-six-percent-excluding-lo rule for UCT', () => {
    const result = service.calculateForUniversity(12, subjects);

    expect(result.rule).toBe('sum-best-six-percent-excluding-lo');
    expect(result.score).toBe(430);
    expect(result.maxScore).toBe(600);
    expect(result.notes[0]).toContain('sum of the best 6 subject percentages excluding Life Orientation');
  });

  it('should calculate best-six-excluding-lo rule for UKZN', () => {
    const result = service.calculateForUniversity(16, subjects);

    expect(result.rule).toBe('best-six-excluding-lo');
    expect(result.score).toBe(33);
    expect(result.maxScore).toBe(42);

    const lo = result.breakdown.find((item) => item.subject === 'Life Orientation');
    expect(lo?.used).toBeFalse();
  });

  it('should calculate ump-seven-with-half-lo rule', () => {
    const result = service.calculateForUniversity(18, subjects);

    expect(result.rule).toBe('ump-seven-with-half-lo');
    expect(result.score).toBe(36.5);
    expect(result.maxScore).toBe(45.5);

    const lo = result.breakdown.find((item) => item.subject === 'Life Orientation');
    expect(lo?.used).toBeTrue();
    expect(lo?.points).toBe(3.5);
  });

  it('should calculate wits-custom rule', () => {
    const result = service.calculateForUniversity(23, subjects);

    expect(result.rule).toBe('wits-custom');
    expect(result.score).toBe(41);
    expect(result.maxScore).toBe(56);

    const english = result.breakdown.find((item) => item.subject === 'English HL');
    const maths = result.breakdown.find((item) => item.subject === 'Mathematics');
    const lo = result.breakdown.find((item) => item.subject === 'Life Orientation');

    expect(english?.points).toBe(9);
    expect(maths?.points).toBe(8);
    expect(lo?.points).toBe(4);
  });

  it('should calculate average-best-six-percent-excluding-lo rule for Stellenbosch', () => {
    const result = service.calculateForUniversity(10, subjects);

    expect(result.rule).toBe('average-best-six-percent-excluding-lo');
    expect(result.score).toBe(71.67);
    expect(result.maxScore).toBe(100);

    const lo = result.breakdown.find((item) => item.subject === 'Life Orientation');
    expect(lo?.used).toBeFalse();
  });

  it('should calculate CUT capped LO 8-level rule', () => {
    const result = service.calculateForUniversity(2, subjects);

    expect(result.rule).toBe('best-six-eight-level-including-lo-capped');
    expect(result.score).toBe(33);
    expect(result.notes[0]).toContain('LO is capped at 1 point');
  });

  it('should calculate divide-by-10-best-six-percent-excluding-lo rule for CPUT', () => {
    const result = service.calculateForUniversity(1, subjects);

    expect(result.rule).toBe('divide-by-10-best-six-percent-excluding-lo');
    expect(result.score).toBe(43);
    expect(result.maxScore).toBe(60);
  });

  it('should calculate uwc-weighted-seven-subject rule', () => {
    const result = service.calculateForUniversity(22, subjects);

    expect(result.rule).toBe('uwc-weighted-seven-subject');
    expect(result.score).toBe(47);
    expect(result.maxScore).toBe(65);

    const english = result.breakdown.find((item) => item.subject === 'English HL');
    const maths = result.breakdown.find((item) => item.subject === 'Mathematics');
    const lo = result.breakdown.find((item) => item.subject === 'Life Orientation');

    expect(english?.points).toBe(13);
    expect(maths?.points).toBe(11);
    expect(lo?.points).toBe(3);
  });
});
