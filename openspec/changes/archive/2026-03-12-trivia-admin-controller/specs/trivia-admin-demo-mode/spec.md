## ADDED Requirements

### Requirement: `?demo=true` pre-loads fixture questions and skips CSV upload
When the admin page is loaded with `?demo=true` in the URL, the UI SHALL automatically fetch the fixture CSV from `/fixtures/trivia-questions.csv`, parse it, and populate the question list without showing the file upload control. The Start Session button SHALL be enabled immediately after successful fixture load.

#### Scenario: Demo mode hides the file upload control
- **WHEN** the admin page loads with `?demo=true`
- **THEN** the file input and upload instructions are not visible

#### Scenario: Demo mode fetches and parses the fixture CSV
- **WHEN** the admin page loads with `?demo=true`
- **THEN** the UI fetches `/fixtures/trivia-questions.csv` and parses it into a question list

#### Scenario: Start Session button is enabled after fixture loads
- **WHEN** the fixture CSV is successfully loaded and contains valid questions
- **THEN** the Start Session button is enabled without any admin interaction

#### Scenario: Demo mode shows question preview list
- **WHEN** the fixture CSV is loaded
- **THEN** the admin sees a preview list of all fixture questions

### Requirement: Fixture CSV is served as a static asset
The server SHALL serve `public/fixtures/trivia-questions.csv` at the path `/fixtures/trivia-questions.csv`. The fixture SHALL contain at least 5 sample trivia questions in valid CSV format.

#### Scenario: Fixture CSV is accessible at known path
- **WHEN** the browser requests `/fixtures/trivia-questions.csv`
- **THEN** the server responds with the CSV file and status 200

#### Scenario: Fixture CSV contains valid questions
- **WHEN** the fixture CSV is parsed by the browser CSV parser
- **THEN** it produces at least 5 valid `TriviaQuestion` objects with no errors
