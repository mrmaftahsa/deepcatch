# Deep Catch

Simple arcade fishing game. Drag your finger left/right to steer the hook down,
then catch fish on the way up. Sell them, upgrade your line, hook size and fish value,
and fill the Trophy Room.

## Get the APK (no installs on your PC)

1. Create a free account at github.com and make a **New repository** (any name).
2. Click **Add file > Upload files**, drag in everything from this folder
   (`www`, `.github`, `package.json`, `capacitor.config.json`, `README.md`) and click **Commit changes**.
   - If the hidden `.github` folder doesn't upload: click **Add file > Create new file**,
     type `.github/workflows/build-apk.yml` as the name, and paste in the contents of that file.
3. Open the **Actions** tab. The "Build Android APK" job starts automatically
   (or click it, then **Run workflow**). It takes about 5-8 minutes.
4. When it shows a green check, open the run and download **deep-catch-apk** at the bottom.
5. Unzip it, send `app-debug.apk` to your phone and install it
   (allow "Install unknown apps" when asked).

To change the game, edit the files in `www/` (`logic.js` = rules, `art.js` = graphics, `ui.js` = screens, `data.js` = fish and upgrade prices) on GitHub (pencil icon) and commit; a new APK builds automatically.
