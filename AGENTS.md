# AGENTS.md

## Project overview

Puzzle Rivals is a production-oriented puzzle game project with responsive support for both mobile and desktop. The codebase should prioritize a complete, playable, polished experience over scattered partial features.

Primary project goals:
- create fun, replayable puzzle gameplay
- prevent repetitive puzzle experiences
- maintain a modern, premium UI
- keep code modular, testable, and production-ready
- support both mobile and desktop by default
- preserve clean architecture and reusable systems

## General working rules

- Always inspect the current repository structure before making major changes.
- Prefer small, targeted improvements over broad rewrites.
- Preserve existing conventions, file structure, and naming unless there is a strong reason to improve them.
- Keep logic modular and easy to extend.
- Separate UI, business logic, content generation, and data/state concerns where possible.
- Prefer production-ready code over mockup shortcuts.
- Avoid placeholder-level implementations unless explicitly requested.
- When assumptions are necessary, state them briefly and choose the most practical modern default.

## Priority order for work

When deciding what to work on next, prioritize in this order:

1. broken core gameplay flows
2. missing end-to-end feature wiring
3. puzzle validity and replay-prevention systems
4. state/data flow issues
5. responsiveness across mobile and desktop
6. accessibility and usability issues
7. design-system consistency
8. tests, validation, and reliability improvements
9. performance improvements
10. polish, animation, and secondary enhancements

Do not prioritize cosmetic polish when foundational functionality is incomplete.

## Skill routing rules

Use installed skills automatically whenever the task clearly matches one of them.

### Preferred routing

- Use `project_next_step_advisor` when asked:
  - what to work on next
  - what the repo is missing
  - how complete the implementation is
  - what the highest-value next step is
  - what the next milestone should be

- Use `milestone_planner` when asked:
  - to break a goal into milestones
  - to create a phased implementation plan
  - to generate execution prompts
  - to create acceptance criteria
  - to sequence work in dependency order

- Use `fullstack_feature_builder` when implementing:
  - complete features spanning UI, state, services, API, validation, and responsiveness
  - player flows
  - puzzle selection flows
  - profiles, leaderboards, rewards, store, onboarding, settings, or dashboards

- Use `design_system_enforcer` when:
  - reviewing or modernizing UI consistency
  - improving spacing, typography, layout, states, responsiveness, or design-system cohesion
  - standardizing components such as buttons, cards, inputs, tabs, modals, tables, or navigation

- Use `bug_triage_and_fix` when:
  - something is broken
  - a flow is failing
  - state is incorrect
  - UI behavior is inconsistent
  - an integration is malfunctioning
  - a regression or error needs diagnosis and repair

- Use `game_content_pipeline` when working on:
  - puzzle generation
  - challenge generation
  - puzzle validity
  - replay prevention
  - content variation
  - difficulty balancing
  - seed tracking
  - near-duplicate avoidance
  - challenge rotation

- Use `content_seed_generator` when creating:
  - seed data
  - fixture data
  - demo content
  - puzzle samples
  - challenge pools
  - leaderboard examples
  - rewards/store sample content
  - player or progression test data

- Use `ui_system_designer` when:
  - designing a new UI from scratch
  - redesigning a screen
  - implementing premium modern responsive interfaces
  - creating desktop and mobile UI versions by default

- Use `animation_builder` when:
  - adding UI motion
  - creating transitions
  - implementing microinteractions
  - adding hover/click/scroll/load animations
  - improving polished motion behavior

- Use `agent_architect` when:
  - designing reusable agents
  - implementing rule-based or AI-assisted repetitive task workers
  - creating generators, assignment systems, content-routing systems, or repetitive automation logic

### Routing priorities

- If the task is unclear, use `project_next_step_advisor` first.
- If the task is strategic or multi-step, use `milestone_planner` before implementation.
- If a task spans multiple areas, select the skill that fits the most central technical challenge.
- Prefer one primary skill at a time unless a second skill is clearly needed after the first completes.
- Do not force a skill when a normal code edit is more appropriate.

## Puzzle Rivals-specific development rules

### Puzzle generation and variation

- Puzzle content must avoid obvious repetition.
- Prevent users from receiving identical or near-identical puzzle variants too often.
- Prefer deterministic or seeded logic where it improves testability and control.
- Use replay-prevention techniques such as:
  - recent history tracking
  - cooldown windows
  - seed exclusion
  - near-duplicate checks
  - template rotation
  - weighted variation
- Generated puzzles must remain valid and playable.
- If puzzle solvability or validity is uncertain, validation must be added before expansion.

### Gameplay flow

When building or editing gameplay-related features, prefer completing a full playable vertical slice:
- select puzzle or mode
- generate or load valid puzzle content
- render the puzzle correctly
- allow user interaction
- track result or completion state
- handle loading, empty, and error cases
- ensure mobile and desktop usability

Do not leave major gameplay features half-wired if the request implies a working flow.

### UI expectations

All UI work should:
- be mobile-first
- include desktop refinement
- use modern production-ready patterns
- have polished states
- avoid cramped layouts
- preserve visual consistency
- include hover, focus, active, disabled, loading, empty, and error states where relevant
- maintain accessibility and readable contrast

Every screen should be intentionally usable on both mobile and desktop unless explicitly scoped otherwise.

### Feature completeness expectations

A feature is not considered complete unless relevant parts are addressed:
- UI rendering
- state handling
- validation
- loading/empty/error states
- responsive behavior
- integration with actual content/data
- basic testability or verification path

## Code quality rules

- Prefer readable, maintainable code over cleverness.
- Keep functions focused.
- Avoid giant classes or giant components when smaller modules are more practical.
- Use clear names for files, functions, variables, and components.
- Keep validation explicit.
- Handle invalid input gracefully.
- Avoid hidden side effects.
- Preserve typing quality where TypeScript is used.
- Prefer reusable components and utilities over duplication.

## Bug-fix expectations

When fixing bugs:
- first identify expected behavior vs actual behavior
- infer reproduction steps from repo context
- isolate likely root cause before patching
- apply the smallest safe fix that resolves the issue
- avoid unrelated churn
- add or update tests if appropriate
- explain the fix clearly

## Planning expectations

When asked for planning:
- produce milestone-based plans
- sequence work in dependency order
- prefer vertical slices over scattered partial progress
- include acceptance criteria
- mention likely files or modules involved
- suggest the most appropriate installed skill when clearly useful

If helpful, provide both:
- an auto-routing execution prompt
- an explicit-skill execution prompt using `$skill-name`

## File inspection priorities

When reviewing the repo, check these first where relevant:
- `README`
- `package.json`
- `AGENTS.md`
- app entry points
- route/page/screen structure
- puzzle/category definitions
- state management files
- services/API logic
- content generation modules
- tests
- TODOs or placeholders
- config files

Use real repo evidence, not generic guesses.

## Done criteria

A task is closer to done when:
- the requested behavior works end to end
- the solution respects repo conventions
- mobile and desktop usage are considered where relevant
- loading/error/empty states are handled where relevant
- obvious regressions are avoided
- code is maintainable and reasonably clean
- the next logical dependency is not left broken

## Avoid

- broad rewrites without clear justification
- generic project-management filler
- recommending polish before core functionality works
- building new features on top of broken foundations
- using heavy AI approaches when deterministic logic is enough
- ignoring replay-prevention for puzzle content
- ignoring responsiveness for UI work
- creating one-off styles when reusable patterns are better

## Default execution style

When given a task:
1. understand the current repo state
2. determine whether one installed skill should be used
3. prefer the most relevant primary skill
4. implement in a scoped, production-oriented way
5. verify behavior logically
6. leave the repo in a cleaner, more complete state than before