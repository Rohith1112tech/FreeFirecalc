# Free Fire Tournament Points Calculator (Scrims Engine)

A tournament points calculator and leaderboard application crafted with a dark red and black futuristic esports gaming theme matching the **NZ PAID SCRIMS** aesthetic.

## ✨ Features (Prompt 1: Setup & Initial Design)

1. **Aesthetic Design**:
   - High-contrast crimson red (`#e50914`, `#ff1744`) and carbon black theme matching the uploaded reference poster (`IMG_20261011_112403.jpg`).
   - Esports typography (`Orbitron`, `Chakra Petch`, and `Rajdhani`).
   - Chamfered parallelogram rank badges (`#01` to `#12`), grooved dark metallic team panels, and glowing red trapezoids.
   - Header with Free Fire branding, crown motif, and "PLAY / FIGHT / WIN" subtext.

2. **Admin Setup Section**:
   - **Total Matches Input**: Specify total matches (e.g., 3, 4, 6, 8, etc.) with quick selector chips.
   - **12 Competing Teams Input**: 12 dedicated slot inputs with custom slot badges.
   - **Autofill & Clear Helpers**: 1-click sample team roster filler for swift testing and demoing.
   - **Scoring System Preview**: Displays the official Free Fire tournament points structure (Booyah = 12 pts down to 10th = 1 pt, plus 1 kill = +1 pt).

3. **Transition & Tournament Screen**:
   - **Start Tournament Button**: Validates inputs, saves settings to `localStorage`, and transitions into the Live Tournament Dashboard.
   - Displays tournament metadata and control tools (Return to setup / Reset tournament).

4. **Match Input Interface (Prompt 2)**:
   - **Dual Tab & Dropdown System**: Match tabs (`MATCH 1`, `MATCH 2`, ..., `MATCH N`) and a synchronized jump dropdown to switch between matches.
   - **Match Status Indicators**: Green indicator dots and `✓ SAVED` badges on completed match tabs, plus overall progress tracking (`X / Y SAVED`).
   - **12 Team Forms per Match**:
     - Placement selector dropdown (`1st Place (12 pts - Booyah)` down to `12th Place (0 pts)`).
     - Elimination / Kills number input (💀) with real-time score preview.
   - **Strict Duplicate Placement Prevention**:
     - Real-time conflict detection: If two teams share a placement rank, both cards pulse with red warnings and display `⚠️ Conflict: Another team is also set to Rank #X!`.
     - Save blocking: The application prevents saving until all 12 teams have unique placements.
   - **Save Match Data**: Locks and persists match scores to `localStorage`.

5. **Points Calculation Logic (Prompt 3)**:
   - **Official Placement Points Scale**:
     - 1st: **12 pts** (Booyah)
     - 2nd: **9 pts**
     - 3rd: **8 pts**
     - 4th: **7 pts**
     - 5th: **6 pts**
     - 6th: **5 pts**
     - 7th: **4 pts**
     - 8th: **3 pts**
     - 9th: **2 pts**
     - 10th: **1 pt**
     - 11th & 12th: **0 pts**
   - **Elimination Kills Rule**: **1 point per kill**.
   - **Match Formula**: `Team Match Total = Placement Points + Kill Points`.
   - **Cumulative Total Across All Played Matches**:
     - Maintains cumulative placement points, elimination kills, and grand total points across all saved matches.

6. **Final Leaderboard Display (Prompt 4)**:
   - **Exact Reference Poster Styling**:
     - Modeled directly after `IMG_20261011_112403.jpg` (*NZ PAID SCRIMS*).
     - Dedicated top hero header (Free Fire branding, red crown, `NZ PAID SCRIMS` brush title, laser flare, `PLAY / FIGHT / WIN`, and cyber ninja badge).
     - Chamfered table frame with glowing crimson borders, angled rank badges (`01` to `12`), crown atop slot `01`, metallic grooved team panels, and red total badges.
     - Footer with `FREE FIRE COMMUNITY` and `GAME ON | NEW CHALLENGERS | PAID SCRIMS`.
   - **12 Ranked Rows**: Ranked `01` to `12` based on cumulative total points.
   - **Official Columns**:
     - **Rank** (`01` to `12`)
     - **Team Name**
     - **Position** (Cumulative placement points or average placement rank toggle)
     - **Elimination** (Total cumulative kills)
     - **Total** (Overall cumulative points)
   - **Automatic & Manual Data Sync**:
     - Leaderboard updates automatically whenever match scores are saved.
     - Includes a dedicated **`🔄 PULL LATEST CUMULATIVE DATA`** button.
   - **Strict Tie-Breaker Resolution**:
     - When total points are tied, the tie is resolved by **Total Kills (Eliminations)**.

7. **Image Export Functionality (Prompt 5 - Social Media Sharing)**:
   - **Integrated html2canvas**:
     - Captures the exact leaderboard HTML element (`#scrims-poster-capture`) into high-resolution graphics.
     - Packaged locally in [`assets/html2canvas.min.js`](file:///d:/FF/assets/html2canvas.min.js) with CDN fallback (100% offline & online support).
   - **Prominent 'Download Results' Button**:
     - Large, glowing cyberpunk CTA button positioned prominently at the bottom of the leaderboard.
     - Additional quick download button in the top navigation bar.
   - **Quality & Format Controls**:
     - **2x Ultra HD**: Scaled capture (`scale: 2`) producing crisp, sharp posters ready for WhatsApp, Instagram, Discord, and YouTube.
     - **PNG (Lossless HD)** and **JPG (Compact)** format selector pills.
     - Automatic file naming with tournament title and timestamp (`FreeFire_[TournamentTitle]_Leaderboard_[Timestamp].[png/jpg]`).
     - Includes fail-safe fallback to built-in canvas generator ensuring export always succeeds.

8. **Data Persistence & Local Storage (Prompt 6)**:
   - **Automatic Real-Time Auto-Save**:
     - Every action (team name changes, match count configuration, match placement and kills entry, tab changes, and display mode preferences) is automatically persisted to browser `localStorage`.
     - Includes a live visual indicator in the tournament top bar: `💾 AUTO-SAVED TO BROWSER` (pulses with `SAVED JUST NOW` upon saving).
   - **Accidental Refresh & Close Recovery**:
     - If the user reloads the page or reopens the browser, the active tournament state reloads immediately — restoring the 12 team names, total matches, current active match, and all previously recorded match scores.
   - **'Reset Tournament' Button & Confirmation Modal**:
     - Prominently placed `🗑️ RESET TOURNAMENT` button with cyber styling.
     - Features a protected confirmation modal explaining that all data will be cleared from local storage before executing a clean reset for a new scrim.


9. **Match Editing & Correction System (Prompt 7)**:
   - **Dedicated 'Edit' Access Next to Completed Matches**:
     - Completed match tabs automatically feature an amber `✏️ EDIT` badge.
     - A dedicated **Match Correction & Edit Quick Access Bar** (`#completed-matches-bar`) renders direct `[ ✏️ Edit Match X ]` quick-selection pills.
     - The **Cumulative Points Matrix Table** includes inline `[ ✏️ EDIT ]` triggers inside each match column header (`M1`, `M2`, etc.).
     - The **Team Match Breakdown Modal** displays inline `[ ✏️ EDIT ]` buttons next to each played match row for instant navigation.
   - **Admin Typo & Scoring Correction Workflow**:
     - Selecting an already-saved match enables **Match Correction Mode** with an amber warning banner:
       `MATCH CORRECTION MODE ACTIVE: You are editing an already-completed match. Make your corrections...`
     - Form cards pre-fill with the match's existing placements and kills.
     - The primary action button transitions to **`⚡ UPDATE & RECALCULATE MATCH SCORES`**.
   - **Instant Dynamic Recalculation Without Tournament Restarts**:
     - Placements continue enforcing strict uniqueness (1-12) to prevent accidental duplicate assignments during edits.
     - Saving the correction instantly updates the match data and triggers automatic recalculation across cumulative points, kills, tie-breakers, leaderboard rankings, and matrix tables.
 10. **Tie-Breaker Logic & Mobile Responsiveness (Prompt 8)**:
    - **Strict 3-Tier Tie-Breaker Sorting Hierarchy**:
      1. **Total Points**: Primary ranking criterion across all played matches.
      2. **Cumulative Kill Points**: If two teams have the exact same Total Points, the team with the higher cumulative Kill Points ranks higher.
      3. **Most Booyahs (1st Place Finishes)**: If both Total Points and Kill Points are tied, the team with the most Booyahs breaks the tie.
      4. Sub-fallback: Cumulative placement points.
    - **Full Mobile Responsiveness & Phone Optimization**:
      - Specially tailored responsive grid systems for phones (`@media (max-width: 768px)` and `@media (max-width: 480px)`).
      - Single-column touch-friendly input cards for team match forms with large select targets (`min-height: 42px`).
      - Horizontal swipeable tabs for match selection and completed match edit pills with `-webkit-overflow-scrolling: touch`.
      - Fluid leaderboard table and poster frame adapting cleanly to small mobile widths without breaking the dark esports visual aesthetic.
      - Full-width mobile CTA buttons for `SAVE MATCH DATA`, `DOWNLOAD RESULTS`, and modal dialogs.

11. **Gaming UI Animations & Count-Up Engine**:
    - **Sequential Row Slide-In**: Leaderboard rows animate into place sequentially from the left with custom timing (`animation-delay: index * 55ms`) and high-tech esports easing curves.
    - **Dynamic Number Count-Up Engine**: Total points numbers count up dynamically from zero upon render using requestAnimationFrame and cubic ease-out, accompanied by crimson neon badge pulsing.

---

## 🌐 Netlify & Cloud Deployment

The repository is pre-configured and deployment-ready with a `public/` directory and automatic build configuration in [`netlify.toml`](file:///d:/FF/netlify.toml).

### Netlify Deployment Settings
- **Build Command**: `npm run build`
- **Publish Directory**: `public`
- **Node Version**: 18+

### Deploy via Netlify CLI
```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Build production assets into /public
npm run build

# 3. Deploy to Netlify
netlify deploy --prod --dir=public
```

### Deploy via Netlify Web UI (GitHub / GitLab / Bitbucket)
1. Push this repository to GitHub.
2. Log into [Netlify](https://app.netlify.com) and click **"Add new site" > "Import an existing project"**.
3. Select your repository. Netlify will auto-detect [`netlify.toml`](file:///d:/FF/netlify.toml):
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
4. Click **"Deploy site"**. Your Free Fire Scrims Calculator is instantly live!

---

## 🚀 How to Run Locally

### Option 1: Open Directly in Browser
Double-click [`index.html`](file:///d:/FF/index.html) (or [`public/index.html`](file:///d:/FF/public/index.html)) to run immediately in any browser without any build step.

### Option 2: Run with Node.js
```bash
npm start
# Server starts at http://localhost:3000
```

### Option 3: Run with Python
```bash
python -m http.server 3000
```
