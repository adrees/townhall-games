## ADDED Requirements

### Requirement: Admin can upload a CSV question file
The admin UI SHALL provide a file input that accepts `.csv` files. Upon selection, the file SHALL be parsed immediately in the browser using the client-side CSV parser without any server call.

#### Scenario: Valid CSV file is parsed and previewed
- **WHEN** the admin selects a well-formed CSV file
- **THEN** the UI displays a preview table of all parsed questions with no error messages

#### Scenario: File input accepts only CSV files
- **WHEN** the admin clicks the file input
- **THEN** the browser file picker filters to `.csv` files by default

### Requirement: Browser-side CSV parser validates questions
The browser SHALL include a CSV parser module (`public/shared/csv-parser.js`) that enforces the same validation rules as the server `CsvParser`. The parser SHALL return a list of parsed questions and a list of row-level error strings. The parser SHALL NOT throw — errors are returned in the error list alongside any valid rows.

#### Scenario: Valid rows are parsed into question objects
- **WHEN** the CSV contains a header `question,a,b,c,d,correct` and valid data rows
- **THEN** each data row is parsed into `{ question, a, b, c, d, correct }` and returned

#### Scenario: Invalid header is reported as an error
- **WHEN** the CSV header does not exactly match `question,a,b,c,d,correct`
- **THEN** the parser returns an error string for row 1 and no questions

#### Scenario: Empty `question` field is reported as an error
- **WHEN** a data row has an empty `question` column
- **THEN** the parser returns an error string naming the row number and column

#### Scenario: Missing columns in a data row are reported as errors
- **WHEN** a data row has fewer than 6 columns
- **THEN** the parser returns an error string for that row

#### Scenario: Invalid `correct` value is reported as an error
- **WHEN** a data row has a `correct` value not in `{A, B, C, D}`
- **THEN** the parser returns an error string for that row

#### Scenario: BOM-prefixed CSV is handled correctly
- **WHEN** the CSV file begins with a UTF-8 BOM character
- **THEN** the BOM is stripped and parsing proceeds normally

#### Scenario: Trailing blank lines are ignored
- **WHEN** the CSV has one or more blank lines at the end
- **THEN** those lines are ignored and parsing proceeds normally

### Requirement: Validation errors are displayed row-by-row before any server call
If the browser CSV parser returns errors, the admin UI SHALL display each error message in a visible error list. The "Start Session" button SHALL remain disabled while errors exist.

#### Scenario: Row errors are listed in the UI
- **WHEN** the parsed CSV contains one or more row-level errors
- **THEN** each error is shown as a separate list item in the error panel

#### Scenario: Start Session button is disabled while errors are present
- **WHEN** one or more CSV errors are displayed
- **THEN** the Start Session button is disabled and cannot be clicked

#### Scenario: Error list clears when a valid file is selected
- **WHEN** the admin selects a new CSV file that parses without errors
- **THEN** the error list is cleared and the Start Session button becomes enabled
