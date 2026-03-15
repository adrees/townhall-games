## MODIFIED Requirements

### Requirement: Broadcast screen regroups surviving names into a resized word cloud after each question
When a `survivors_regrouped` event is received (and no elimination animation is in progress), the broadcast screen SHALL transition to the survivor phase, reposition remaining names within the word cloud, and scale their font size larger to fill the available space. The survivor count SHALL be shown prominently. The screen SHALL hold this state until the presenter advances to the next question.

#### Scenario: Survivor phase activates on survivors_regrouped after elimination animation completes
- **WHEN** the broadcast screen receives a `survivors_regrouped` event and the elimination animation window has elapsed
- **THEN** the survivor section becomes visible

#### Scenario: Survivor count is displayed prominently
- **WHEN** a `survivors_regrouped` event is received with `survivorCount: 7`
- **THEN** the broadcast screen shows "7 survivors" (or equivalent) in a prominent position

#### Scenario: Surviving names reposition within the word cloud
- **WHEN** the survivor phase activates
- **THEN** remaining name elements animate to new positions within the word cloud container

#### Scenario: Surviving names grow larger as player count drops
- **WHEN** fewer survivors remain
- **THEN** the font size of each name is larger compared to rounds with more survivors

#### Scenario: Survivor phase holds until next question
- **WHEN** the survivor phase is active and no further events are received
- **THEN** the broadcast screen remains in the survivor state indefinitely until a `question_preview` or `question_live` event arrives
