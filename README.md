# Routine — Daily Habit & Productivity Tracker

A dark, minimalist routine tracker: unlimited custom tasks with their own color/icon/schedule, a segmented completion ring on the dashboard, calendar history, and a stats page (streaks, weekly trends, most consistent habits).

Built with React + Vite + Tailwind CSS + lucide-react. Data is stored locally in the browser (`localStorage`) — no backend required to run it.

## Run it locally

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview it with `npm run preview`.

## Push to GitHub

From inside this folder:

```bash
git init
git add .
git commit -m "Initial commit: routine tracker app"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

(Create the empty repo on GitHub first, or use `gh repo create` if you have the GitHub CLI installed.)

## Deploy

Any static host works since this is a Vite SPA with no backend:
- **Cloudflare Pages** — build command `npm run build`, output directory `dist`
- **Vercel** — auto-detects Vite, no config needed
- **Netlify** — build command `npm run build`, publish directory `dist`

## Notes on the current version

- **Storage**: uses `localStorage`, so data lives per-browser/device only. To add real user accounts + cloud sync (as noted in the app concept), you'd need a backend — similar shape to the Skiné Express backend, but this time storing JSON per user instead of files.
- **Reminders**: the reminder toggle is stored on each task but doesn't yet trigger real notifications. That needs the Notifications API + a service worker (for it to fire even when the tab's closed), which is a good next milestone.
- **Not yet built**: Pomodoro timer, focus mode, mood tracking, AI routine suggestions, sleep/fitness integrations — all listed as "future features" in the original concept.
