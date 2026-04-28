# SmartMeal

SmartMeal is a web application for planning meals across the week and building
an automatic shopping list from the planned dishes. The project is designed as
a team assignment for a university course.

## Project scope

### Core requirements

- add meals for selected days of the week
- assign category and ingredients to each meal
- generate a shopping list from planned meals

### Extra requirements

- mark shopping list items as purchased
- show a weekly summary of planned meals and activity

## Suggested team split

- Student 1: weekly planner, meal form, edit and delete actions
- Student 2: shopping list logic, purchase toggle, filters or extra features
- Student 3: README, manual tests, screenshots, presentation, final polish

## Branch strategy

- `main` - stable project version
- `feature/weekly-planner` - planner and form work
- `feature/shopping-list` - shopping list module
- `feature/docs-presentation` - docs, screenshots, presentation files

## Commit examples

- `feat: initialize React app`
- `feat: add weekly planner layout`
- `feat: create meal form and validation`
- `feat: generate shopping list from meal ingredients`
- `feat: add purchased item toggle`
- `docs: add project setup guide`
- `style: refine dashboard layout`

## Trello board ideas

- Create repository structure
- Build weekly planner view
- Add meal form with category and ingredients
- Implement edit and delete actions
- Generate shopping list from saved meals
- Add purchased item toggle
- Write README and setup guide
- Prepare screenshots and final presentation

## Getting started

```bash
npm install
npm run dev
```

## Demo workflow

1. Add meals for different days of the week.
2. Review the generated shopping list.
3. Mark ingredients as purchased.
4. Show the weekly summary on the dashboard.
