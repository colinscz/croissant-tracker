# Self-hosting on Hetzner Cloud

This guide puts the whole Croissant Tracker stack on one Hetzner Cloud server
with Docker Compose:

```
                 ┌───────────────────── Hetzner Cloud server ─────────────────────┐
 browser ──443──▶│ caddy ──▶ app (Nuxt/Nitro :3000) ──▶ postgres :5432 (croissant) │
                 │   │                   │ JWKS                    ▲              │
                 │   └──────▶ hanko (:8000) ◀──┘                   │              │
                 │                │──────────────────────────────▶ (hanko db)     │
                 │                └──▶ SMTP provider :587 (sign-in passcodes)     │
                 └────────────────────────────────────────────────────────────────┘
```

Only Caddy is reachable from the internet. It terminates TLS (Let's Encrypt,
automatic) for two hostnames:

| Hostname | Example | Routed to |
|---|---|---|
| `APP_DOMAIN` | `croissants.example.com` | the Nuxt app |
| `AUTH_DOMAIN` | `auth.croissants.example.com` | the Hanko API |

Images are **built on the server** from this repository. Nothing is pushed to a
registry.

---

## 1. Create the server

In the [Hetzner Cloud Console](https://console.hetzner.cloud/):

1. **Add Server**
   - **Location:** whichever is closest to your team.
   - **Image:** Ubuntu 24.04.
   - **Type:** a shared-vCPU **x86** plan with **at least 4 GB RAM**. Building
     the Nuxt image needs roughly 2 GB, and Postgres, Hanko and the app need very
     little once running. With 2 GB RAM, add swap first (see below).
     Arm (CAX) plans also work if every image you use is published for arm64.
     Check that `ghcr.io/teamhanko/hanko` has an arm64 build for the version
     you pin before choosing Arm.
   - **SSH key:** add your public key. Don't use password login.
   - **Backups:** worth enabling. Hetzner keeps 7 daily whole-server snapshots
     for a small surcharge.
2. **Firewalls → Create Firewall** and attach it to the server. Inbound rules:
   - TCP 22 (SSH), ideally restricted to your own IPs
   - TCP 80 (Let's Encrypt HTTP challenge, redirect to HTTPS)
   - TCP 443 and UDP 443 (HTTPS / HTTP/3)

   Use the Hetzner Cloud Firewall rather than `ufw` on the host: Docker writes
   its own iptables rules for published ports and bypasses `ufw`.

## 2. Point DNS at it

At your DNS provider, create records for both hostnames pointing at the
server's public IPv4 (A) and, optionally, IPv6 (AAAA):

```
croissants.example.com        A     203.0.113.10
auth.croissants.example.com   A     203.0.113.10
```

Caddy can only get certificates once these resolve, so do this before the first
`docker compose up`.

**Keep both hostnames under the same parent domain.** Passkeys are bound to
`APP_DOMAIN` (WebAuthn relying party), and the Hanko session cookie lives on
`APP_DOMAIN` too. `AUTH_DOMAIN` only serves the API.

## 3. Prepare the server

SSH in as root and create a non-root user for deployments:

```bash
ssh root@203.0.113.10
```

```bash
adduser --disabled-password --gecos "" deploy && usermod -aG sudo deploy && rsync -a ~/.ssh /home/deploy/ && chown -R deploy:deploy /home/deploy/.ssh
```

Install Docker Engine and the Compose plugin from Docker's official apt
repository ([docs](https://docs.docker.com/engine/install/ubuntu/)):

```bash
apt-get update && apt-get install -y ca-certificates curl git
```

```bash
install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc && chmod a+r /etc/apt/keyrings/docker.asc
```

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
```

```bash
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

```bash
usermod -aG docker deploy
```

Optional, but recommended on 2 GB servers: add a 2 GB swap file.

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Enable unattended security updates:

```bash
apt-get install -y unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades
```

## 4. Get the code and configure it

As `deploy`:

```bash
ssh deploy@203.0.113.10
```

```bash
git clone https://github.com/colinscz/croissant-tracker.git && cd croissant-tracker
```

If the repository is private, add a read-only
[deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
to the server and clone over SSH instead.

```bash
cp .env.example .env && chmod 600 .env
```

Generate one value for each password and secret:

```bash
for v in POSTGRES_PASSWORD CROISSANT_OWNER_PASSWORD CROISSANT_APP_PASSWORD HANKO_DB_PASSWORD HANKO_SECRET_KEY; do echo "$v=$(openssl rand -base64 48 | tr -d '/+=' | cut -c1-40)"; done
```

Then edit `.env`:

```dotenv
APP_DOMAIN=croissants.example.com
APP_URL=https://croissants.example.com
AUTH_DOMAIN=auth.croissants.example.com
HANKO_PUBLIC_URL=https://auth.croissants.example.com
ACME_EMAIL=you@example.com

POSTGRES_PASSWORD=…              # from the loop above
CROISSANT_OWNER_PASSWORD=…
CROISSANT_APP_PASSWORD=…
HANKO_DB_PASSWORD=…
HANKO_SECRET_KEY=…

SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_USER=…
SMTP_PASSWORD=…
SMTP_FROM_ADDRESS=croissants@example.com
SMTP_FROM_NAME=Croissant Tracker
```

The last three `NUXT_*` / `DATABASE_OWNER_URL` lines in `.env.example` are only
for running Nuxt outside Docker. You can delete them on the server.

### Email (sign-in passcodes)

Hanko emails a one-time passcode for every sign-in and sign-up, so working SMTP
is required. **Hetzner blocks outbound ports 25 and 465 on new accounts.** Use a
transactional email provider that accepts submissions on **587** with STARTTLS,
for example Postmark, Brevo, Mailgun, Amazon SES or Scaleway TEM. Set up SPF and
DKIM for the `SMTP_FROM_ADDRESS` domain as your provider describes, or passcodes
will land in spam.

## 5. Start it

```bash
docker compose up -d --build
```

The first build takes a few minutes. Compose then starts things in order:

1. `postgres` initialises the data volume and runs
   `docker/postgres/init/01-roles.sh`, which creates the `croissant` and `hanko`
   databases and the `croissant_owner`, `croissant_app` and `hanko` roles.
2. `hanko-migrate` and `app-migrate` apply their schemas, then exit with code 0.
3. `hanko` and `app` start, and `caddy` fetches certificates.

Check it:

```bash
docker compose ps -a
```

```bash
docker compose logs -f caddy app hanko
```

Open `https://croissants.example.com`. You should land on the sign-in page.
Enter your email, type the passcode you receive, and you're in. Optionally add a
passkey when prompted. Then create a team at `/teams`. Colleagues need to sign in
once before you can add them by email.

## 6. Operating it

### Updating

```bash
cd ~/croissant-tracker && git pull && docker compose up -d --build
```

`app-migrate` runs on every `up` and applies only new migrations. To move to a
newer Hanko release, set `HANKO_VERSION` in `.env` (see the
[releases](https://github.com/teamhanko/hanko/releases), backend tags look like
`backend/v3.x.y`, images like `ghcr.io/teamhanko/hanko:v3.x.y`). Then run
`docker compose up -d`. `hanko-migrate` handles Hanko's schema.

Clean up old images now and then:

```bash
docker image prune -f
```

### Backups

Both databases live in the `postgres-data` volume. Hetzner's server backups
cover it, but a logical dump is easier to restore and to move elsewhere.
Nightly dumps with 14 days of retention:

```bash
mkdir -p ~/backups && crontab -l 2>/dev/null | { cat; echo '17 3 * * * cd ~/croissant-tracker && for db in croissant hanko; do docker compose exec -T postgres pg_dump -U postgres -Fc "$db" > ~/backups/"$db"-$(date +\%F).dump; done && find ~/backups -name "*.dump" -mtime +14 -delete'; } | crontab -
```

To keep copies off the server, ship `~/backups` to a
[Hetzner Storage Box](https://www.hetzner.com/storage/storage-box/) with
`rsync -e 'ssh -p 23' ~/backups/ uXXXXX@uXXXXX.your-storagebox.de:croissant/`
(add it to the same cron line).

Restore a dump into a running stack:

```bash
docker compose exec -T postgres pg_restore -U postgres --clean --if-exists -d croissant < ~/backups/croissant-YYYY-MM-DD.dump
```

### Rotating secrets

- **Database passwords** in `.env` are only read when the volume is first
  created. To change one later, update the role too, then restart:

  ```bash
  docker compose exec postgres psql -U postgres -c "alter role croissant_app password 'NEW_PASSWORD'"
  ```

- **`HANKO_SECRET_KEY`:** Hanko accepts a comma-separated list, where the first
  key signs new sessions and the others still verify. Prepend a new key, wait out
  the session lifespan (one week), then drop the old one.

### Building elsewhere (optional)

If the server is too small to build, build on your machine and copy the images
over. No registry is needed:

```bash
docker build --target app -t croissant-tracker:latest . && docker build --target migrate -t croissant-tracker-migrate:latest .
```

```bash
docker save croissant-tracker:latest croissant-tracker-migrate:latest | gzip | ssh deploy@203.0.113.10 'gunzip | docker load'
```

```bash
ssh deploy@203.0.113.10 'cd croissant-tracker && git pull && docker compose up -d --no-build'
```

If your machine is an Apple Silicon Mac and the server is x86, add
`--platform linux/amd64` to both `docker build` commands.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Caddy logs `no such host` / ACME errors | DNS records missing or not propagated; port 80 blocked in the Cloud Firewall |
| Passcode email never arrives | SMTP on port 25/465 (blocked by Hetzner); wrong SMTP credentials. Check `docker compose logs hanko` |
| Sign-in works but the app bounces back to `/login` | `APP_URL` doesn't match the browser origin exactly (CORS), or `HANKO_PUBLIC_URL` is wrong |
| Passkey creation fails | `APP_DOMAIN` doesn't match the hostname in the browser |
| `app-migrate` exits non-zero | `docker compose logs app-migrate`. Usually the owner password in `.env` was changed after the volume was created |
| API answers 401 for a signed-in user | The app can't reach `http://hanko:8000/.well-known/jwks.json`. Check that `hanko` is running |
