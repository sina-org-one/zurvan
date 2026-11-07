# Server demo deployment

The server stack is `compose.server.yaml`. It runs the production Node app, PostgreSQL, SeaweedFS, and Caddy on one Linux server. The default domain is **https://k9training.zurvann.ir**. The existing `compose.yaml` remains the localhost testing stack.

## Server prerequisites

- A Linux server with Bash, Git, OpenSSL, `flock` (usually supplied by `util-linux`), and curl for downloading the script. Node/npm on the host are unnecessary.
- Docker Engine and the Docker Compose plugin **v2.20 or later**. Follow [Docker's installation instructions](https://docs.docker.com/engine/install/) for your distribution. Docker must start on boot.
- DNS A (and AAAA, if present) records for `k9training.zurvann.ir` pointing to this server. Remove an AAAA record if the server cannot receive IPv6 traffic.
- Inbound **TCP 80 and 443** open in both the server and provider firewalls; UDP 443 is optional for HTTP/3. Ports 80 and 443 must be available for Caddy. If nginx or another proxy already owns them, integrate with that proxy or free the ports before using this stack.
- Outbound access to GitHub, npm, Docker image registries, and the certificate authority. Builds happen on the server. A small VPS with around 4 GB RAM is a reasonable starting point for building the app alongside the demo services; memory use depends on traffic and uploads.

Caddy obtains and renews HTTPS certificates and redirects the domain's HTTP requests to HTTPS automatically ([Caddy documentation](https://caddyserver.com/docs/automatic-https)). An optional IPv4 address can also serve the site over plain HTTP. No Certbot or manual certificate configuration is needed. If using Cloudflare, use DNS-only during initial setup; when enabling the proxy afterward, use Full (strict) TLS.

## First deployment

First commit and push the deployment files to the public GitHub repository. Then run on the **server**:

```bash
curl -fsSL https://raw.githubusercontent.com/sina-org-one/zurvan/main/deploy.sh -o /tmp/k9training-deploy.sh
sudo bash /tmp/k9training-deploy.sh --db-push --seed
```

The script clones `https://github.com/sina-org-one/zurvan.git`, branch `main`, into `/opt/k9training`. It creates a private `.env` once, builds the images, starts storage, creates the media bucket if missing, saves a database dump, pushes the schema, seeds the showcase, and starts the app and proxy. It waits for the app's home page to respond successfully; that page reads the database. Initial HTTPS issuance may take another minute.

The generated `.env` contains these Compose settings:

```dotenv
DOMAIN=k9training.zurvann.ir
HTTP_IP=
POSTGRES_PASSWORD=<random 64-character hex value>
BETTER_AUTH_SECRET=<random 64-character hex value>
```

Compose supplies the remaining application variables, including the internal database/storage addresses and `BETTER_AUTH_URL=https://${DOMAIN}`. This server `.env` serves a different purpose from the development `.env.example`. Do not copy your development `.env` to the server or source `.env` in a shell. The script never overwrites an existing file and sets its permissions to `600`.

If running as a non-root user with Docker access, use a directory you own:

```bash
bash /tmp/k9training-deploy.sh --dir "$HOME/k9training" --db-push --seed
```

Use the same user and directory for subsequent deployments. Run one instance of this stack per Docker host: its Compose project name is fixed to `zurvan-demo` so volume names stay stable.

## Open the site by IP

Pass the VPS's public IPv4 address once to enable `http://YOUR_SERVER_IP` alongside the HTTPS domain:

```bash
# Download the latest script so an older checkout can recognize --ip.
curl -fsSL https://raw.githubusercontent.com/sina-org-one/zurvan/main/deploy.sh -o /tmp/k9training-deploy.sh

# Existing deployment: no schema push or reseeding needed.
sudo bash /tmp/k9training-deploy.sh --dir /opt/k9training --ip YOUR_SERVER_IP

# On first deployment, combine it with the database setup flags:
sudo bash /tmp/k9training-deploy.sh --ip YOUR_SERVER_IP --db-push --seed
```

Replace `YOUR_SERVER_IP` with the actual address, without a protocol or port. The script saves it as `HTTP_IP` in `.env`, including when upgrading an existing deployment. Later updates need no `--ip` flag. To change the address, edit `HTTP_IP` in `.env` and redeploy; leave it empty to disable public IP access. Without an address, HTTP access is limited to the loopback host `127.0.0.1`.

Sign-in, media, referral cookies, and demo payment returns work on either address. Domain cookies remain secure; IP cookies use HTTP and sessions are separate between the two addresses, so sign in separately on each. HTTP traffic is unencrypted; use it for this demo and use the HTTPS domain for private data. IP access needs TCP 80 available, but does not need DNS or a certificate.

## Update

```bash
sudo bash /opt/k9training/deploy.sh
```

This fetches the configured branch, fast-forwards the checkout, builds using Docker's layer cache, recreates the app, and reloads Caddy. The old app stays up while images build. There is a short interruption when the app is replaced. `.env`, database contents, uploaded media, and TLS certificates survive updates and server restarts.

Git updates refuse to overwrite modified tracked files or divergent local commits. Keep server configuration in `.env`. The script uses a lock to prevent simultaneous deployments. An updated version of the script takes effect on its next invocation.

To change an existing deployment's domain, point the new hostname's DNS records at the server, edit `/opt/k9training/.env` to set `DOMAIN=k9training.zurvann.ir`, and rerun the update command above. Compose uses this value for both Caddy and `BETTER_AUTH_URL`; the deployment updates the app and proxy configuration, and Caddy obtains the new HTTPS certificate. Changing the script's default or passing `--domain` does not overwrite an existing `.env`.

If a change includes a schema update:

```bash
sudo bash /opt/k9training/deploy.sh --db-push
```

**`--db-push` automatically approves schema changes, including changes that drop data.** It uses Drizzle Kit's schema push API with `--force`, equivalent to the CLI's forced push. The API lets SQL errors propagate reliably, because the installed CLI can exit successfully after logging an error. The script stops the app and saves a database dump before pushing. Review schema changes before deploying them. A failed database operation leaves the app stopped; resolve the error and rerun the script. This is a demo workflow, not a versioned production migration system.

**Known problem: `--db-push` cannot upgrade a database that already has tables with a composite primary key.** With the installed Drizzle Kit (0.31.11) the push API ignores query parameters, and reading a table with a composite primary key needs one, so the push stops with «there is no parameter $1». The demo has two such tables (`course_prerequisite`, `dog_passed_course`), so this fails on any database after the first deployment (an empty database has nothing to read, which is why the first deployment worked). It was reproduced with the live commit's own `deploy/push-schema.mjs`. Because the script stops the app first, **the app stays stopped until you rerun the script without `--db-push`.** The simplest way through is `--db-push --seed`, which wipes the database first so the push meets an empty one (see below). To keep the data, use a reviewed SQL file in one transaction instead, after a backup. `deploy/schema-diff.mjs` prints the SQL between the live revision's schema and the current one; `deploy/upgrade-2026-10-overnight.sql` is one such file, with the steps in `docs/overnight/04-DEPLOYMENT-AND-ROLLBACK.md`.

Reset the demo story when needed:

```bash
sudo bash /opt/k9training/deploy.sh --seed
# Or combine schema and demo updates:
sudo bash /opt/k9training/deploy.sh --db-push --seed
```

`--seed` runs `npm run db:seed:demo`: it updates the catalogue and replaces the demo customers' dogs, purchases, evaluations, and media. It is repeatable, but intentionally resets their activity. Use `--seed-catalogue` to update only the course catalogue. Both seed options save a database dump first.

**`--db-push --seed` wipes the whole database** (`DROP SCHEMA public CASCADE`) after the dump, then pushes the schema onto the empty database and seeds it. Every account and record made on the live site is gone; only the seeded catalogue and demo accounts come back. Photos uploaded by other accounts stay in the media bucket with nothing pointing at them. This is the way to take a schema change when the data is all demo, because the push works on an empty database (the known problem above). To get the old data back, restore the dump from `.deploy/backups/`.

Other options:

| Option          | Behavior                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--backup`      | Save a database dump during an otherwise normal deployment.                                                         |
| `--no-pull`     | Build/deploy the existing clean checkout without fetching GitHub.                                                   |
| `--no-cache`    | Rebuild Docker layers without cache.                                                                                |
| `--pull-images` | Refresh service images and build base images.                                                                       |
| `--dir PATH`    | Select a checkout directory; defaults to the script's repo if run from a checkout, otherwise `/opt/k9training`.     |
| `--branch NAME` | Deploy another branch; pass it on every update of that checkout. Existing checkouts must already be on that branch. |
| `--repo URL`    | Select another Git remote; pass it again on subsequent updates.                                                     |
| `--domain HOST` | Choose a domain on initial setup. To change an existing deployment, edit `DOMAIN` in `.env` and rerun.              |
| `--ip ADDRESS`  | Enable HTTP on this IPv4 address and save it as `HTTP_IP`. Edit `.env` to change or disable it later.               |
| `--help`        | Print available options.                                                                                            |

## Static image caching

Caddy sets `Cache-Control: public, max-age=86400` on successful photo, brand, demo image, favicon, and app icon and font (`/pwa/icon-*`, `/pwa/fonts/*`) responses, including conditional `304` responses. Browsers can reuse these images for one day. Error responses keep the app's original cache policy. Vite's development server and the local Docker stack do not use this Caddy configuration.

Run the normal deployment update to apply the policy. Replacing an image at the same URL can take up to one day to reach returning visitors; use a new filename when an update must appear immediately. To check the deployed header, run `curl -I https://k9training.zurvann.ir/photo/new-design/wave.webp`. In browser DevTools, leave **Disable cache** unchecked when checking reuse; a hard reload can bypass the browser cache.

## The Android app's asset links

`public/.well-known/assetlinks.json` (once it exists) ties the Android app to this domain: if it is missing, or the domain changes, the app shows an address bar. Keep it deployed, and see [mobile-app.md](mobile-app.md) before changing `DOMAIN`. The service worker `/sw.js` is never cached long by Caddy, so a new one reaches browsers on their next visit.

## Media exposure

SeaweedFS has **no authentication**, and **no published host ports**. The app and one-off tools access it on the Docker network. Caddy is the only public entry point.

The Caddyfile allows only `GET` and `HEAD` requests matching:

```text
/media/{avatar|dog|course|certificate|evaluation}/{uuid}/{variant}.webp
```

These map to `/zurvann/{kind}/{uuid}/{variant}.webp` on SeaweedFS. Query parameters, cookies, and authorization headers are removed before forwarding. Every other `/media` request returns `404`, including uploads, deletes, bucket listings, directories, arbitrary keys, and videos. The S3, master, volume, and filer APIs have no public port or proxy route.

Evaluation videos remain private and are served through the app's session-checked `/api/evaluation-videos/:id` route. Caddy accepts request bodies up to 110 MB for the app's video uploads.

Showcase mode uses the public sign-in code **12345**, simulated payments, and the demo accounts shown on the login page. Use only demo data: anyone can access those accounts, including the demo Admin.

## Logs and status

```bash
cd /opt/k9training
sudo docker compose --env-file .env -f compose.server.yaml ps
sudo docker compose --env-file .env -f compose.server.yaml logs --tail=100 app caddy
sudo docker compose --env-file .env -f compose.server.yaml logs --tail=100 db seaweedfs
```

If HTTPS fails, inspect Caddy logs and check DNS, port availability, and both firewalls. If the app is unhealthy after a schema change, inspect app logs and verify that `--db-push` succeeded. A plain deployment does not push the schema or seed the database.

## Backups and data

Database dumps are stored under `/opt/k9training/.deploy/backups/` in PostgreSQL custom format (`*.dump`). A temporary `.dump.tmp` file indicates an incomplete dump. Backups stay on the server; copy them elsewhere if you need protection from server loss, and remove old dumps manually when no longer needed.

These dumps **do not back up media**. A demo reset can delete old bucket objects, so a database dump alone cannot fully undo a media-changing seed. For a complete snapshot, stop the app, save a database dump and `.env`, stop SeaweedFS, and back up the `zurvan-demo_media` Docker volume before starting services again. Keep credentials private.

To restore a database dump (replaces the current database objects), after checking the file you intend to restore:

```bash
sudo -i
cd /opt/k9training
docker compose --env-file .env -f compose.server.yaml stop app
docker compose --env-file .env -f compose.server.yaml exec -T db \
  pg_restore -U zurvan -d zurvan --clean --if-exists --exit-on-error < .deploy/backups/YOUR_BACKUP.dump
bash ./deploy.sh --no-pull
exit
```

The root shell allows the redirection to read root-owned backups. Restore the application revision that matches the database schema before restarting it; `--no-pull` deploys whichever revision is checked out.

The named volumes are `zurvan-demo_pgdata`, `zurvan-demo_media`, `zurvan-demo_caddy_data`, and `zurvan-demo_caddy_config`. `docker compose --env-file .env -f compose.server.yaml down` stops/removes containers and keeps these volumes. **Adding `-v` deletes them.** Keep `.env` with the database: changing its password does not automatically change an existing PostgreSQL user's password, and changing the auth secret signs everyone out.
