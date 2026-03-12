import type { TriviaQuestion, AnswerOption } from '../../types';

export class CsvParseError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`Import failed. ${errors.length} error${errors.length === 1 ? '' : 's'} found:\n${errors.join('\n')}`);
    this.errors = errors;
  }
}

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);
const REQUIRED_HEADERS = ['question', 'a', 'b', 'c', 'd', 'correct'];

export class CsvParser {
  static parse(csv: string): TriviaQuestion[] {
    const errors: string[] = [];
    const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    // Strip BOM if present
    if (lines[0].charCodeAt(0) === 0xFEFF) {
      lines[0] = lines[0].slice(1);
    }

    // Remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }

    if (lines.length === 0) {
      throw new CsvParseError(['File is empty']);
    }

    // Validate header
    const headerCols = CsvParser.splitRow(lines[0]).map(h => h.trim().toLowerCase());
    if (headerCols.join(',') !== REQUIRED_HEADERS.join(',')) {
      errors.push(`Row 1 (header): must be exactly "question,a,b,c,d,correct" — got "${lines[0].trim()}"`);
    }

    const dataLines = lines.slice(1);

    // Question count validation
    if (dataLines.length < 3) {
      errors.push(`Too few questions: minimum is 3, found ${dataLines.length}`);
    } else if (dataLines.length > 15) {
      errors.push(`Too many questions: maximum is 15, found ${dataLines.length}`);
    }

    // Per-row validation
    const seenQuestions = new Map<string, number>(); // normalised text → first row number
    const questions: TriviaQuestion[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2; // 1-based, offset by header
      const line = dataLines[i];
      if (line.trim() === '') continue;

      const cols = CsvParser.splitRow(line).map(c => c.trim());

      if (cols.length < 6 || cols.slice(0, 6).some(c => c === '')) {
        errors.push(`Row ${rowNum}: all 6 columns (question, a, b, c, d, correct) must be populated`);
        continue;
      }

      const [questionText, a, b, c, d, correctRaw] = cols;
      const correctUpper = correctRaw.toUpperCase();

      if (!VALID_ANSWERS.has(correctUpper)) {
        errors.push(`Row ${rowNum}: "correct" must be A, B, C, or D — got "${correctRaw}"`);
      }

      const normalised = questionText.toLowerCase();
      if (seenQuestions.has(normalised)) {
        errors.push(`Row ${rowNum}: duplicate question text (same as row ${seenQuestions.get(normalised)})`);
      } else {
        seenQuestions.set(normalised, rowNum);
      }

      questions.push({
        question: questionText,
        a,
        b,
        c,
        d,
        correct: correctUpper as AnswerOption,
      });
    }

    if (errors.length > 0) {
      throw new CsvParseError(errors);
    }

    return questions;
  }

  /**
   * Minimal CSV row splitter. Handles double-quoted fields (no embedded quotes).
   * V1 spec only requires simple CSV — no quoted commas or multiline fields.
   */
  private static splitRow(line: string): string[] {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    return cols;
  }
}
