# App Assets

  The app icon and splash images (`icon.png`, `logo.png`, `splash-icon.png`) are stored in:

  ```
  artifacts/bara/assets/images/
  ```

  These files are ~1.1 MB each and were not included in the initial push due to size constraints.
  They should be added manually via:

  ```bash
  git add artifacts/bara/assets/images/
  git commit -m "Add app icon assets"
  git push
  ```

  The images are used by Expo for the app icon, splash screen, and in-app logo display.
  