import { CsvParser, CsvParseError } from '../games/trivia/csv-parser';

const VALID_HEADER = 'question,a,b,c,d,correct';

function makeRows(count: number, startIndex = 1): string {
  return Array.from(
    { length: count },
    (_, i) => `"Question ${startIndex + i}","Opt A","Opt B","Opt C","Opt D",A`
  ).join('\n');
}

function makeCsv(rows: string): string {
  return `${VALID_HEADER}\n${rows}`;
}

describe('CsvParser', () => {
  describe('valid input', () => {
    it('parses a minimal valid CSV (3 questions)', () => {
      const csv = makeCsv(makeRows(3));
      const questions = CsvParser.parse(csv);
      expect(questions).toHaveLength(3);
      expect(questions[0]).toMatchObject({
        question: 'Question 1',
        a: 'Opt A',
        b: 'Opt B',
        c: 'Opt C',
        d: 'Opt D',
        correct: 'A',
      });
    });

    it('parses a full valid CSV (15 questions)', () => {
      const csv = makeCsv(makeRows(15));
      const questions = CsvParser.parse(csv);
      expect(questions).toHaveLength(15);
    });

    it('returns correct TriviaQuestion shape for each row', () => {
      const csv = `${VALID_HEADER}\n"Q1","A","B","C","D",A\n"Q2","A","B","C","D",B\n"Who founded it?","Alice","Bob","Carol","Dave",B`;
      const questions = CsvParser.parse(csv);
      const last = questions[questions.length - 1];
      expect(last.correct).toBe('B');
      expect(last.question).toBe('Who founded it?');
      expect(last.a).toBe('Alice');
    });

    it('normalises lowercase correct answer to uppercase', () => {
      const csv = `${VALID_HEADER}\n"Q1","A","B","C","D",a\n"Q2","A","B","C","D",b\n"Q3","A","B","C","D",c`;
      const questions = CsvParser.parse(csv);
      expect(questions[0].correct).toBe('A');
      expect(questions[1].correct).toBe('B');
      expect(questions[2].correct).toBe('C');
    });

    it('handles CRLF line endings', () => {
      const csv = `${VALID_HEADER}\r\n${makeRows(3).replace(/\n/g, '\r\n')}`;
      const questions = CsvParser.parse(csv);
      expect(questions).toHaveLength(3);
    });

    it('trims whitespace from column values', () => {
      const csv = `${VALID_HEADER}\n" Q1 "," A "," B "," C "," D ", A\n"Q2","A","B","C","D",A\n"Q3","A","B","C","D",A`;
      const questions = CsvParser.parse(csv);
      expect(questions[0].question).toBe('Q1');
      expect(questions[0].a).toBe('A');
    });
  });

  describe('header validation', () => {
    it('rejects missing header', () => {
      const csv = makeRows(3); // no header line
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('rejects wrong column order in header', () => {
      const csv = `question,correct,a,b,c,d\n${makeRows(3)}`;
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('rejects extra columns in header', () => {
      const csv = `question,a,b,c,d,correct,extra\n${makeRows(3)}`;
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('accepts header with different case', () => {
      const csv = `Question,A,B,C,D,Correct\n${makeRows(3)}`;
      expect(() => CsvParser.parse(csv)).not.toThrow();
    });
  });

  describe('row completeness', () => {
    it('rejects a row with a missing column', () => {
      const csv = `${VALID_HEADER}\n"Q1","A","B","C",A\n"Q2","A","B","C","D",A\n"Q3","A","B","C","D",A`;
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('reports the correct row number for the bad row', () => {
      const csv = `${VALID_HEADER}\n"Q1","A","B","C","D",A\n"Q2","A","B",A\n"Q3","A","B","C","D",A`;
      try {
        CsvParser.parse(csv);
        fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(CsvParseError);
        expect((e as CsvParseError).errors.some(err => err.includes('Row 3'))).toBe(true);
      }
    });

    it('rejects a row with an empty question field', () => {
      const csv = `${VALID_HEADER}\n"","A","B","C","D",A\n"Q2","A","B","C","D",A\n"Q3","A","B","C","D",A`;
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });
  });

  describe('correct column validation', () => {
    it('rejects correct value of E', () => {
      const csv = `${VALID_HEADER}\n"Q1","A","B","C","D",E\n"Q2","A","B","C","D",A\n"Q3","A","B","C","D",A`;
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('rejects numeric correct value', () => {
      const csv = `${VALID_HEADER}\n"Q1","A","B","C","D",1\n"Q2","A","B","C","D",A\n"Q3","A","B","C","D",A`;
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('reports the row number of the invalid correct value', () => {
      const csv = `${VALID_HEADER}\n"Q1","A","B","C","D",A\n"Q2","A","B","C","D",X\n"Q3","A","B","C","D",A`;
      try {
        CsvParser.parse(csv);
        fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(CsvParseError);
        expect((e as CsvParseError).errors.some(err => err.includes('Row 3'))).toBe(true);
      }
    });
  });

  describe('question count validation', () => {
    it('rejects fewer than 3 questions', () => {
      const csv = makeCsv(makeRows(2));
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('rejects 0 questions', () => {
      const csv = makeCsv('');
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('rejects more than 15 questions', () => {
      const csv = makeCsv(makeRows(16));
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('accepts exactly 3 questions', () => {
      const csv = makeCsv(makeRows(3));
      expect(() => CsvParser.parse(csv)).not.toThrow();
    });

    it('accepts exactly 15 questions', () => {
      const csv = makeCsv(makeRows(15));
      expect(() => CsvParser.parse(csv)).not.toThrow();
    });
  });

  describe('duplicate question detection', () => {
    it('rejects duplicate question text', () => {
      const csv = `${VALID_HEADER}\n"Same question","A","B","C","D",A\n"Different question","A","B","C","D",B\n"Same question","A","B","C","D",C`;
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });

    it('duplicate check is case-insensitive', () => {
      const csv = `${VALID_HEADER}\n"same question","A","B","C","D",A\n"Q2","A","B","C","D",B\n"SAME QUESTION","A","B","C","D",C`;
      expect(() => CsvParser.parse(csv)).toThrow(CsvParseError);
    });
  });

  describe('error collection', () => {
    it('collects multiple errors before throwing', () => {
      // bad correct on row 2, bad correct on row 4
      const csv = `${VALID_HEADER}\n"Q1","A","B","C","D",A\n"Q2","A","B","C","D",Z\n"Q3","A","B","C","D",A\n"Q4","A","B","C","D",X\n"Q5","A","B","C","D",A`;
      try {
        CsvParser.parse(csv);
        fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(CsvParseError);
        expect((e as CsvParseError).errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
