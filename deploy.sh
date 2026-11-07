#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

usage() {
  cat <<'HELP'
Usage: bash deploy.sh [options]

Clone/update GitHub, build, and deploy the showcase with Docker Compose.
On the first run, use --db-push --seed. Later, run without flags to update.

  --dir PATH        Checkout directory (this script's repo, otherwise /opt/k9training)
  --repo URL        Git remote (default: https://github.com/sina-org-one/zurvan.git)
  --branch NAME     Branch to deploy (default: main)
  --domain HOST     Domain on first setup (default: k9training.zurvann.ir)
  --ip ADDRESS      Also serve HTTP on this IPv4 address (saved in .env)
  --db-push         Push Drizzle schema; auto-approves potentially destructive SQL
  --seed            Seed catalogue and reset demo accounts' history/photos
                    (with --db-push: wipe the whole database, push, then seed)
  --seed-catalogue  Seed only the course catalogue (exclusive with --seed)
  --backup          Also save a database dump (automatic before push or seed)
  --no-pull         Deploy the existing checkout without fetching GitHub
  --no-cache        Build images without Docker's layer cache
  --pull-images     Refresh base/service images before building
  -h, --help        Show this help

Existing .env, database, media, and HTTPS certificates are preserved.
Requires Linux, Bash, Git, OpenSSL, flock, Docker, and Compose v2.20+.
HELP
}

die() { printf 'Error: %s\n' "$*" >&2; exit 1; }
log() { printf '\n%s\n' "$*"; }

valid_ipv4() {
  [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1
  local octet
  local -a octets
  IFS=. read -r -a octets <<< "$1"
  for octet in "${octets[@]}"; do
    [[ "$octet" == 0 || "$octet" != 0* ]] && ((10#$octet <= 255)) || return 1
  done
}

main() {
  local script_dir deploy_dir repo branch domain domain_requested http_ip=""
  script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  deploy_dir=/opt/k9training
  if [[ -d "$script_dir/.git" && -f "$script_dir/compose.server.yaml" ]]; then
    deploy_dir="$script_dir"
  fi
  repo=https://github.com/sina-org-one/zurvan.git
  branch=main
  domain=k9training.zurvann.ir
  domain_requested=false
  local db_push=false seed=false seed_catalogue=false backup=false
  local no_pull=false no_cache=false pull_images=false

  while (($#)); do
    case "$1" in
      --dir|--repo|--branch|--domain|--ip)
        [[ $# -ge 2 && -n "$2" && "$2" != --* ]] || die "$1 requires a value."
        case "$1" in
          --dir) deploy_dir="$2" ;;
          --repo) repo="$2" ;;
          --branch) branch="$2" ;;
          --domain) domain="$2"; domain_requested=true ;;
          --ip) http_ip="$2" ;;
        esac
        shift 2 ;;
      --db-push) db_push=true; shift ;;
      --seed) seed=true; shift ;;
      --seed-catalogue) seed_catalogue=true; shift ;;
      --backup) backup=true; shift ;;
      --no-pull) no_pull=true; shift ;;
      --no-cache) no_cache=true; shift ;;
      --pull-images) pull_images=true; shift ;;
      -h|--help) usage; return ;;
      *) die "Unknown option: $1 (see --help)." ;;
    esac
  done
  if $seed && $seed_catalogue; then die "Choose --seed or --seed-catalogue."; fi
  [[ "$domain" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ && "$domain" == *.* && "$domain" != *..* ]] || die "Use a bare lowercase domain, such as k9training.zurvann.ir."
  [[ -z "$http_ip" ]] || valid_ipv4 "$http_ip" || die "--ip requires a bare IPv4 address, such as 203.0.113.10."
  local dependency
  for dependency in git openssl flock docker; do
    command -v "$dependency" >/dev/null || die "Install $dependency first."
  done
  git check-ref-format --branch "$branch" >/dev/null || die "Invalid branch: $branch"
  docker info >/dev/null 2>&1 || die "Docker is unavailable. Start Docker and use an account allowed to access it."
  local compose_version major minor
  compose_version="$(docker compose version --short)" || die "Install the Docker Compose v2 plugin."
  compose_version="${compose_version#v}"
  IFS=. read -r major minor _ <<< "$compose_version"
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]] || die "Cannot read Compose version."
  ((major > 2 || (major == 2 && minor >= 20))) || die "Docker Compose v2.20+ is required."

  # Canonicalize the path, then lock a sibling file so even the first clone is locked.
  mkdir -p -- "$(dirname -- "$deploy_dir")"
  deploy_dir="$(cd -- "$(dirname -- "$deploy_dir")" && pwd)/$(basename -- "$deploy_dir")"
  [[ "$deploy_dir" != / && "$deploy_dir" != */. && "$deploy_dir" != */.. ]] || die "Choose a dedicated checkout directory."
  exec 9>"${deploy_dir}.deploy.lock"
  flock -n 9 || die "Another deployment is running for $deploy_dir."

  if [[ ! -d "$deploy_dir/.git" ]]; then
    $no_pull && die "--no-pull requires an existing checkout."
    if [[ -e "$deploy_dir" ]]; then
      [[ -d "$deploy_dir" && -z "$(ls -A -- "$deploy_dir")" ]] || die "$deploy_dir exists and is not an empty Git checkout destination."
    fi
    log "Cloning $repo ($branch) into $deploy_dir..."
    git clone --branch "$branch" --single-branch -- "$repo" "$deploy_dir"
  else
    [[ "$(git -C "$deploy_dir" rev-parse --show-toplevel)" == "$deploy_dir" ]] || die "--dir must point at the checkout root."
    git -C "$deploy_dir" diff --quiet && git -C "$deploy_dir" diff --cached --quiet || die "Tracked files have local changes. Commit or move them before deploying."
    if ! $no_pull; then
      local actual_repo actual_branch
      actual_repo="$(git -C "$deploy_dir" remote get-url origin)"
      [[ "${actual_repo%.git}" == "${repo%.git}" ]] || die "Origin differs from --repo. Pass --repo '$actual_repo' explicitly."
      actual_branch="$(git -C "$deploy_dir" branch --show-current)"
      [[ "$actual_branch" == "$branch" ]] || die "Checkout is on '$actual_branch'; use --branch '$actual_branch' or a separate --dir."
      log "Fetching $branch..."
      git -C "$deploy_dir" fetch --prune origin "$branch"
      git -C "$deploy_dir" merge --ff-only FETCH_HEAD
    fi
  fi
  cd -- "$deploy_dir"
  [[ -f compose.server.yaml && -f deploy/Caddyfile ]] || die "The checked-out revision does not include the server deployment files. Push them to GitHub first."

  [[ ! -L .env ]] || die ".env must be a regular file, not a symlink."
  if [[ ! -e .env ]]; then
    $db_push || die "First deployment needs --db-push (usually --db-push --seed)."
    local db_password auth_secret
    db_password="$(openssl rand -hex 32)"
    auth_secret="$(openssl rand -hex 32)"
    cat > .env <<ENV
# Created by deploy.sh; preserved on subsequent deployments. Keep this file private.
DOMAIN=$domain
HTTP_IP=$http_ip
POSTGRES_PASSWORD=$db_password
BETTER_AUTH_SECRET=$auth_secret
ENV
    log "Created $deploy_dir/.env with random database and session secrets."
  fi
  [[ -f .env && ! -L .env ]] || die ".env must be a regular file, not a symlink."
  chmod 600 .env
  local saved_domain
  saved_domain="$(sed -n 's/^DOMAIN=//p' .env)"
  [[ "$saved_domain" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ && "$saved_domain" == *.* && "$saved_domain" != *..* ]] || die ".env needs a bare DOMAIN=hostname (see docs/deploy.md)."
  if $domain_requested && [[ "$saved_domain" != "$domain" ]]; then
    die "Existing .env uses DOMAIN=$saved_domain. Edit that file to change the domain."
  fi
  domain="$saved_domain"
  local saved_ip
  saved_ip="$(sed -n 's/^HTTP_IP=//p' .env)"
  [[ -z "$saved_ip" ]] || valid_ipv4 "$saved_ip" || die ".env needs HTTP_IP to be a bare IPv4 address."
  if [[ -n "$http_ip" && "$http_ip" != "$saved_ip" ]]; then
    [[ -z "$saved_ip" ]] || die "Existing .env uses HTTP_IP=$saved_ip. Edit that file to change the IP."
    if [[ -n "$(sed -n '/^HTTP_IP=/p' .env)" ]]; then
      sed -i "s/^HTTP_IP=.*/HTTP_IP=$http_ip/" .env
    else
      printf '\nHTTP_IP=%s\n' "$http_ip" >> .env
    fi
    log "Saved HTTP_IP=$http_ip in $deploy_dir/.env."
  fi
  http_ip="$(sed -n 's/^HTTP_IP=//p' .env)"
  # Compose constructs the DB URL; the generated hex password is URL-safe.
  local saved_password
  saved_password="$(sed -n 's/^POSTGRES_PASSWORD=//p' .env)"
  [[ "$saved_password" =~ ^[a-zA-Z0-9_-]{32,}$ ]] || die "Use a URL-safe POSTGRES_PASSWORD of at least 32 characters (letters, digits, _ or -)."

  # Explicit server settings come from the saved file, even if the invoking shell
  # happens to export variables with the same names.
  local -a compose=(env -u DOMAIN -u HTTP_IP -u POSTGRES_PASSWORD -u BETTER_AUTH_SECRET docker compose --project-name zurvan-demo --project-directory "$deploy_dir" --env-file "$deploy_dir/.env" -f "$deploy_dir/compose.server.yaml")
  "${compose[@]}" config --quiet
  trap 'printf "\nDeployment failed. Inspect: docker compose --env-file .env -f compose.server.yaml logs --tail=100\nIf database work had started, the app may be stopped; fix the issue and rerun deploy.sh.\n" >&2' ERR
  local -a build_args=()
  $no_cache && build_args+=(--no-cache)
  if $pull_images; then
    "${compose[@]}" pull db seaweedfs caddy
    build_args+=(--pull)
  fi
  log "Building application and database tools (the running app stays up during the build)..."
  "${compose[@]}" build "${build_args[@]}" app tools
  "${compose[@]}" run --rm --no-deps -T tools node --import tsx -e "import('./app/env.server.ts')"
  "${compose[@]}" run --rm --no-deps -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  "${compose[@]}" up -d --wait --wait-timeout 180 db seaweedfs
  "${compose[@]}" run --rm --no-deps -T tools node deploy/init-storage.mjs

  if $db_push || $seed || $seed_catalogue; then
    # Demo seeding replaces data; prevent concurrent app writes while it runs.
    log "Stopping the app for database changes..."
    "${compose[@]}" stop app
    backup=true
  fi
  if $backup; then
    mkdir -p .deploy/backups
    chmod 700 .deploy .deploy/backups
    local backup_file=".deploy/backups/$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
    log "Saving database backup to $backup_file..."
    "${compose[@]}" exec -T db pg_dump -U zurvan -d zurvan -Fc > "$backup_file.tmp"
    mv -- "$backup_file.tmp" "$backup_file"
  fi
  if $db_push && $seed; then
    # Drizzle Kit's push crashes while reading an existing table with a composite primary key (docs/deploy.md), so it
    # only works on an empty database. The demo seed rebuilds everything anyway; the dump above keeps the old data.
    log "Wiping the database so the schema is pushed onto an empty one (the seed rebuilds the demo)..."
    "${compose[@]}" exec -T db psql -U zurvan -d zurvan -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
  fi
  if $db_push; then
    log "Pushing schema (--force auto-approves schema changes, including data loss)..."
    "${compose[@]}" run --rm --no-deps -T tools node --import tsx deploy/push-schema.mjs --force
  fi
  if $seed; then
    log "Seeding catalogue and resetting demo accounts' activity..."
    "${compose[@]}" run --rm --no-deps -T tools npm run db:seed:demo
  elif $seed_catalogue; then
    "${compose[@]}" run --rm --no-deps -T tools npm run db:seed
  fi

  log "Starting the updated app and waiting for its database-backed home page..."
  "${compose[@]}" up -d --wait --wait-timeout 180 --force-recreate app
  "${compose[@]}" up -d --wait --wait-timeout 60 caddy
  # A bind-mounted Caddyfile can change without Compose recreating the proxy.
  "${compose[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  "${compose[@]}" ps
  log "Deployed commit $(git rev-parse --short HEAD). URL: https://$domain"
  [[ -z "$http_ip" ]] || printf 'IP URL: http://%s\n' "$http_ip"
  printf 'Caddy obtains HTTPS automatically; first certificate issuance can take a minute.\n'
}

# Load the entire function before pulling changes that may replace this script.
main "$@"
