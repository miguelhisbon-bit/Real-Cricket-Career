REAL CRICKET CAREER V9 — iPhone / GitHub Pages COPY VERSION

FILES
-----
index.html  = complete HTML interface
style.css   = complete responsive/mobile UI styling
data.js     = player, teams and match data
game.js     = complete playable match + career engine
career.js   = optional compatibility file for older repositories

INSTALL ON GITHUB
-----------------
1. Unzip this folder on iPhone.
2. Open your GitHub repository.
3. Replace/copy these files into the repository root:
   index.html
   style.css
   data.js
   game.js
4. career.js is optional and is NOT loaded by the V9 index.html.
   If your repository already has an old career.js, you may leave it there.
5. Commit the changes.
6. Open/reload GitHub Pages.

NO BUILD / NO NPM
-----------------
This version is a static HTML/CSS/JavaScript project. No npm, webpack,
Replit, server, or build command is required.

GAMEPLAY
--------
• 11-player match setup
• User batting and bowling modes
• AI teammate batting
• AI shot decisions
• 0 / 1 / 2 / 3 / 4 / 6 / W ball results
• Strike rotation on odd runs and over completion
• Dynamic field and stadium
• Batter, bowler, umpire and fielders
• Bat swing and ball-flight animation
• Special FOUR and SIX celebration effects
• Wide / Batter / Bowler camera modes
• Pause and new-match controls
• Career stats, XP, OVR and local save

COPYING CODE
------------
All source files are plain text files. You can open index.html or style.css
on iPhone and copy the complete code directly.

V9 IMPORTANT NOTE
-----------------
The V9 career save and match engine are contained in game.js. This avoids
an old career.js dependency causing a blank screen or broken match.
