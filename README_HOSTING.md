# Deployment on regular web hosting

Upload the contents of this `app` folder to a PHP-enabled hosting directory, for example `public_html/training`.

Required hosting features:
- PHP 8.0 or newer.
- Write permission for the `data` folder.
- HTTPS for iPhone PWA installation and secure password transfer.

Setup:
1. Open `config.php`.
2. Replace `change-this-password` with your own password.
3. Upload all files and folders from `app`.
4. Make sure `data/training-log.json` is writable by PHP.
5. Open `https://your-domain.example/training/index.html`.
6. Enter the server password when the app asks for it.

Files to upload:
- `index.html`
- `styles.css`
- `app.js`
- `api.php`
- `config.php`
- `manifest.webmanifest`
- `service-worker.js`
- `icon.svg`
- `data/.htaccess`
- `data/training-log.json`

Notes:
- Records are stored on the server in `data/training-log.json`.
- The browser also keeps a local backup and will sync when the server is reachable.
- On Apache hosting, `data/.htaccess` blocks direct access to stored data.
- If the host uses Nginx and ignores `.htaccess`, configure the host panel to deny web access to the `data` folder.
