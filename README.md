# Student Wrapped

A personalised student year-in-review web app — plain HTML, CSS, and JavaScript. No frameworks, no build step, no backend.

## Features

- **Profile, Academics, Achievements, Lifestyle** — enter and edit your own data
- **Study Clock** — timestamp-based focus timer (pause does not count)
- **Music** — search and play free ~30s previews via the iTunes Search API (no account or API key)
- **My Wrapped** — story slides built only from what you entered
- **Share** — download a 1080×1920 PNG, Web Share, WhatsApp text, or print
- **Settings** — export JSON, load sample data, or clear everything

All data stays in your browser (`localStorage`). Nothing is sent to a server.

## Run locally

Open `index.html` in a browser, or use a static server / VS Code Live Server:

```bash
npx serve .
```

## Project structure

```
index.html      App pages and layout
css/style.css   Styles
js/
  config.js         Constants and themes
  storage.js        Save / load / export / sample data
  academics.js      Mark averages and rankings
  study-clock.js    Timer logic
  music.js          iTunes search
  wrapped.js        Story slide builder
  share.js          Share text and canvas image
  app.js            Navigation, forms, UI wiring
```

## Music

1. Open **Music**
2. Search a song or artist
3. Press **Play** for a ~30 second preview  
   Each play counts toward your ranking for Wrapped.

## Deploy

Upload this folder to any static host (Netlify, Cloudflare Pages, GitHub Pages). No build command. HTTPS is recommended.

## Privacy

Your data stays on this device. It is not synced across browsers or computers. Clearing site data removes it.
