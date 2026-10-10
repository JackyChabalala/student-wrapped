# Student Wrapped

A personalised student year-in-review web app — plain HTML, CSS, and JavaScript. No frameworks, no build step, no backend.

**Live demo:** [https://jackychabalala.github.io/student-wrapped/](https://jackychabalala.github.io/student-wrapped/)

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

## Deploy (live URL)

This is a static site. Host the folder on any static host. No build command.

### GitHub Pages (used for this repo)

1. Push the project to a GitHub repository
2. On GitHub: **Settings → Pages**
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**
4. Choose branch `main` and folder `/` (root), then **Save**
5. After a minute or two, open:  
   `https://<your-username>.github.io/<repo-name>/`

For this project that is:  
https://jackychabalala.github.io/student-wrapped/

### Other hosts

- **Netlify:** drag-and-drop the project folder at [app.netlify.com/drop](https://app.netlify.com/drop), or connect the GitHub repo (publish directory = `.`, no build command)
- **Cloudflare Pages:** connect the repo or upload the folder; same settings (no build, output = root)

## Privacy

Your data stays on this device. It is not synced across browsers or computers. Clearing site data removes it.
