# Joliza Yogourt website

The site includes a small Python backend for contact, order, and stockist
inquiries. Submissions are stored in a local SQLite database. When SMTP is
configured, the backend also emails each inquiry to the site owner. This is an
inquiry form, not an online checkout or payment system.

## Publish the complete site on Render

The `render.yaml` blueprint deploys the website and Python inquiry backend as a
single service. This keeps the contact form and site on the same origin. It
also attaches a persistent disk for the SQLite inquiry database. The Render
Starter service and persistent disk are paid resources; check Render's current
pricing before deploying.

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint**, connect this repository, and apply
   the `render.yaml` configuration. Approve the paid web service and disk.
3. Wait for the service to deploy. Render assigns a public `onrender.com`
   address; open it and check that `/api/health` returns `{"status":"ok"}`.
4. Submit a test message through the site's contact form. Without SMTP settings,
   inquiries are still saved to the persistent disk, but email notifications
   are unavailable.
5. In the Render service's **Environment** settings, set
   `JOLIZA_SMTP_USERNAME` and `JOLIZA_EMAIL_FROM` to your Gmail address, and
   set `JOLIZA_SMTP_PASSWORD` to a Gmail App Password. The blueprint sets
   Gmail's SMTP host and port; save the settings and redeploy.

The service reads Render's `PORT` environment variable and binds to `0.0.0.0`.
The configured persistent disk stores inquiries across deploys and restarts.
Do not set the database path to a location outside that disk.

The repository also has a GitHub Pages workflow for a static preview at
<https://lisapurity56.github.io/my-web3/>. GitHub Pages does not run the Python
backend, so its contact form will not submit inquiries. Use the Render URL as
the complete, working site.

## Run locally

```sh
python3 server.py
```

Open Chrome or Firefox yourself and visit <http://127.0.0.1:8000>. Do not open
`index.html` from Thunderbird: Thunderbird is an email app, not a web browser.
If double-clicking the page launches Thunderbird, change your operating
system's default app for web pages/HTML files to Chrome or Firefox.

Python 3.9 or newer is required; the backend uses only the standard library.
The server creates `data/inquiries.sqlite3` on startup and restricts its file
permissions on POSIX systems.

## Enable inquiry email notifications

Without SMTP settings, the backend still saves inquiries and reports that email
notifications are not configured. The Render blueprint sets Gmail's SMTP host
and port and prompts for the sender address and credentials as private
environment variables. Locally, set the following before starting the server,
or put them in a `.env` file in the repository root:

```sh
JOLIZA_SMTP_HOST=smtp.gmail.com
JOLIZA_SMTP_PORT=465
JOLIZA_SMTP_USERNAME=your-sending-address@gmail.com
JOLIZA_SMTP_PASSWORD=your-email-provider-app-password
JOLIZA_EMAIL_FROM=your-sending-address@gmail.com
JOLIZA_NOTIFY_EMAIL=lisapurity56@gmail.com
```

The server loads `.env` at startup. Values already set in the process
environment take precedence. Keep `.env` private and do not commit mail
credentials to the repository.

Use an app password or SMTP credential from your email provider, not your
regular account password. For Gmail, enable 2-Step Verification and create an
App Password. Port `587` uses STARTTLS; port `465` uses implicit TLS. Never
commit mail credentials to the repository.
If email delivery fails, the inquiry remains saved and the server logs the
failure without logging the submitted message or email address.

If the server logs an SMTP authentication rejection, confirm that the username
is the complete sending account address and that the password is a current
SMTP/app password for that account. For Gmail, enable 2-Step Verification and
create an App Password; a regular Google account password will not work. If an
app password was exposed or revoked, revoke it and create a replacement, then
update `.env` and restart the server. Gmail SMTP authentication cannot be fixed
by retrying with different TLS settings when using port `465`.

## View submitted inquiries

Stop the server and run:

```sh
python3 server.py list-inquiries
```

The database path defaults to `data/inquiries.sqlite3`. Set `JOLIZA_DB_PATH` to
use a different path. `HOST` and `PORT` can also be set to change the bind
address and port; the default bind address is local-only (`127.0.0.1`).

## Run backend tests

```sh
python3 -m unittest discover -s tests -v
```

## API

- `GET /api/health` — health check.
- `POST /api/inquiries` — accepts JSON with `inquiry_type` (`general`, `order`,
  or `stockist`), `name`, `email`, `message`, and an optional `website`
  honeypot field. Successful submissions return `201`; invalid submissions
  return a descriptive `4xx` response.

For a custom domain, configure it in the Render service's **Settings → Custom
Domains** and follow Render's DNS instructions. Review the persistent disk's
backup and retention options regularly; the disk is the live database, not a
backup.
