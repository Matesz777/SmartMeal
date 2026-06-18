# SmartMeal

SmartMeal is a React-based web application for weekly meal planning and automatic shopping list generation. It helps organize meals by day, category, and ingredients, then turns planned meals into a shopping list you can mark as purchased.

## Features

- Add meals for each day of the week
- Assign a category and ingredient list to each meal
- Edit and delete planned meals
- Generate an aggregated shopping list automatically
- Toggle purchased items in the shopping list
- Filter the planner view by category and planned days
- Generate a simple weekly report for meal and shopping status
- Responsive UI with mobile-friendly layout improvements

## Technologies

- React 19
- Vite 8
- ESLint for static code checks
- Vanilla CSS for styling

## Setup

### Prerequisites

- Node.js installed on your system
- npm available through `npm` or `npm.cmd` on Windows

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Then open the app at:

```text
http://localhost:5173/
```

## Project structure

- `src/App.jsx` — main application logic and state management
- `src/App.css` — app-specific layout and responsive styles
- `src/index.css` — global base styles and font settings
- `src/main.jsx` — React application entry point
- `index.html` — application shell used by Vite

## Scripts

- `npm run dev` — start the Vite development server
- `npm run build` — create a production build
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint checks on the codebase

## Notes

- The app stores meals and purchased shopping items in browser `localStorage`.
- The report generator downloads a text file with the selected date range and meal plan.
- Accessibility is improved with `aria-*` attributes and form error messages.

## Recommended improvements

- Add unit tests for meal validation and list generation
- Improve keyboard navigation for planner tabs and buttons
- Add a compact mobile view for the planner and shopping list
- Add a warning for unsaved form changes before leaving the page
