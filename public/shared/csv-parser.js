// Browser-side CSV parser — mirrors server CsvParser validation rules.
// Returns { questions, errors } instead of throwing, for immediate UI feedback.

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);
const REQUIRED_HEADERS = ['question', 'a', 'b', 'c', 'd', 'correct'];

function splitRow(line) {
    const cols = [];
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

/**
 * Parse a CSV string of trivia questions.
 * @param {string} csv
 * @returns {{ questions: object[], errors: string[] }}
 */
export function parseCsv(csv) {
    const errors = [];
    const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    // Strip BOM
    if (lines.length > 0 && lines[0].charCodeAt(0) === 0xFEFF) {
        lines[0] = lines[0].slice(1);
    }

    // Remove trailing blank lines
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
    }

    if (lines.length === 0) {
        return { questions: [], errors: ['File is empty'] };
    }

    // Validate header
    const headerCols = splitRow(lines[0]).map(h => h.trim().toLowerCase());
    if (headerCols.join(',') !== REQUIRED_HEADERS.join(',')) {
        errors.push(`Row 1 (header): must be exactly "question,a,b,c,d,correct" — got "${lines[0].trim()}"`);
    }

    const dataLines = lines.slice(1);

    if (dataLines.length < 3) {
        errors.push(`Too few questions: minimum is 3, found ${dataLines.length}`);
    } else if (dataLines.length > 15) {
        errors.push(`Too many questions: maximum is 15, found ${dataLines.length}`);
    }

    const seenQuestions = new Map();
    const questions = [];

    for (let i = 0; i < dataLines.length; i++) {
        const rowNum = i + 2;
        const line = dataLines[i];
        if (line.trim() === '') continue;

        const cols = splitRow(line).map(c => c.trim());

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

        questions.push({ question: questionText, a, b, c, d, correct: correctUpper });
    }

    return { questions, errors };
}
