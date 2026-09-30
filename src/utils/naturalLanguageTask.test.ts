import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageTask } from '../components/tabs/TimeBlockingTab';

describe('parseNaturalLanguageTask', () => {
  it('does not default duration to 60 when no duration is specified', () => {
    const result = parseNaturalLanguageTask('رياضيات');
    expect(result.durationMins).toBeNull();
    expect(result.subject).toBe('Mathématiques');

    const result2 = parseNaturalLanguageTask('حل مسائل فيزياء');
    expect(result2.durationMins).toBeNull();
    expect(result2.subject).toBe('Physique Chimie');
  });

  it('correctly parses French compound durations like 1h30, 2h, 45min, 1.5h', () => {
    expect(parseNaturalLanguageTask('maths 1h30').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('maths 1h 30').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('maths 1h 30min').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('maths 2h').durationMins).toBe(120);
    expect(parseNaturalLanguageTask('maths 45min').durationMins).toBe(45);
    expect(parseNaturalLanguageTask('maths 1.5h').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('maths 1,5h').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('maths 0.5h').durationMins).toBe(30);
  });

  it('correctly parses Arabic durations: ساعة ونصف, ساعة و نصف, ساعتين, etc.', () => {
    // 1h30 variations
    expect(parseNaturalLanguageTask('رياضيات ساعة ونصف').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('رياضيات ساعة و نصف').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('رياضيات ساعه ونصف').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('رياضيات ساعه و نصف').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('رياضيات ساعه ونص').durationMins).toBe(90);

    // Other compound durations
    expect(parseNaturalLanguageTask('رياضيات ساعة وربع').durationMins).toBe(75);
    expect(parseNaturalLanguageTask('رياضيات ساعة وثلث').durationMins).toBe(80);
    expect(parseNaturalLanguageTask('رياضيات ساعة و 40 دقيقة').durationMins).toBe(100);
    expect(parseNaturalLanguageTask('رياضيات ساعتين ونصف').durationMins).toBe(150);
    expect(parseNaturalLanguageTask('رياضيات ساعتين و نصف').durationMins).toBe(150);
    expect(parseNaturalLanguageTask('رياضيات ساعتين').durationMins).toBe(120);
    expect(parseNaturalLanguageTask('رياضيات ساعتان').durationMins).toBe(120);
    expect(parseNaturalLanguageTask('رياضيات نصف ساعة').durationMins).toBe(30);
    expect(parseNaturalLanguageTask('رياضيات ربع ساعة').durationMins).toBe(15);
    expect(parseNaturalLanguageTask('رياضيات ثلث ساعة').durationMins).toBe(20);
    expect(parseNaturalLanguageTask('رياضيات ساعة واحدة').durationMins).toBe(60);
    expect(parseNaturalLanguageTask('رياضيات 3 ساعات').durationMins).toBe(180);
  });

  it('correctly parses explicit minute counts like 45 دقيقة or 90 دقيقة', () => {
    expect(parseNaturalLanguageTask('فيزياء 45 دقيقة').durationMins).toBe(45);
    expect(parseNaturalLanguageTask('فيزياء 90 دقيقة').durationMins).toBe(90);
    expect(parseNaturalLanguageTask('فيزياء 25 دقيقة').durationMins).toBe(25);
    expect(parseNaturalLanguageTask('تاريخ 10 دقائق').durationMins).toBe(10);
  });
});
