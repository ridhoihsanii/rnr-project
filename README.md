# RNR — Rack N Roll Tournament System

Professional billiard tournament management software for Rack N Roll.

![Pure Frontend](https://img.shields.io/badge/Pure%20Frontend-HTML%2FCSS%2FJS-FACC15?style=for-the-badge&labelColor=0A0A0A)
![No Backend](https://img.shields.io/badge/No%20Backend-Local%20Only-FACC15?style=for-the-badge&labelColor=0A0A0A)
![GitHub Pages Ready](https://img.shields.io/badge/GitHub%20Pages-Ready-FACC15?style=for-the-badge&labelColor=0A0A0A)
![Mobile Friendly](https://img.shields.io/badge/Mobile-Friendly-FACC15?style=for-the-badge&labelColor=0A0A0A)

## Features

- Tournament setup with venue name configuration and support for 32, 64 and 128 player sizes
- Participant registration table with inline spreadsheet-style editing
- Payment status tracking for Cash and Transfer transactions
- Phone number-based auto-fill for faster participant entry
- HC (Handicap) selection with a custom option
- Drawing system with duplicate prevention and quadrant distribution for multi-entry participants
- Challonge-style horizontal single-elimination tournament bracket
- Score input with automatic winner advancement
- LIVE match mode with blinking indicator
- Statistics dashboard with animated counters
- Export and import support for JSON, Excel (`.xlsx`), and PDF
- Print bracket functionality
- LocalStorage persistence with auto-save on refresh
- Responsive mobile-friendly design
- Glassmorphism RNR Yellow & Black premium UI
- Zoom controls for 75%, 100%, 125%, and 150%, plus fullscreen bracket mode

## Screenshots

> 📸 Screenshot coming soon

## Tech Stack

- HTML5, CSS3, JavaScript ES6
- Bootstrap 5.3
- Font Awesome 6
- Poppins (Google Fonts)
- SheetJS (`xlsx`) for Excel
- html2canvas + jsPDF for PDF export

## Project Structure

```text
rnr-project/
├── index.html              # Main application shell
├── assets/
│   ├── css/
│   │   └── style.css       # RNR design system
│   ├── js/
│   │   ├── storage.js      # LocalStorage layer
│   │   ├── drawing.js      # Drawing/slot system
│   │   ├── tournament.js   # Tournament logic
│   │   ├── bracket.js      # Bracket renderer
│   │   ├── ui.js           # UI helpers
│   │   └── app.js          # Main application
│   └── img/                # Images (optional)
└── README.md
```

## Installation & Usage

### Local

1. Clone or download the repository.
2. Open `index.html` in a browser.
3. No build step required — just open and use.

### GitHub Pages

This repository includes an automated GitHub Actions workflow that builds and deploys the site to GitHub Pages on every push to `main`.

1. Push the project to a GitHub repository (already done).
2. Workflow will run and publish to Pages. The site is expected at `https://<your-username>.github.io/rnr-project/`.
3. If Pages shows 404, wait ~1–2 minutes for provisioning, or check Actions → Workflows for build logs.
## Usage Guide

- **Dashboard**: Overview of tournament stats.
- **Tournament Setup**: Set venue name and tournament size, click **Save**, then **Generate Bracket**.
- **List Peserta**: Enter phone number, participant name, and HC. Click **DRAW** for slot assignment and **SAVE** to persist data.
- **Tournament Bracket**: View and manage match progression. Click **PLAYING** to activate a match, then enter scores to determine the winner.
- **Statistics**: Review detailed tournament analytics.
- **Export/Import**: Back up and restore tournament data.

## Branding

RNR follows the **RACK N ROLL** visual identity with a premium yellow and black color scheme, centered on **#FACC15** and **#0A0A0A** for a strong, modern tournament presentation.

---

Built with ❤️ by Ihsan
