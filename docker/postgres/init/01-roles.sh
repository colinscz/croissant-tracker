#!/bin/sh
# Runs once, when the postgres container starts with an empty data volume
# (docker-entrypoint-initdb.d). Creates:
#
#   croissant_owner  owns the `croissant` database and every object in it; only
#                    the app-migrate service logs in as this role.
#   croissant_app    the login the Nuxt server uses. NOBYPASSRLS and owns nothing,
#                    so the row-level security policies apply to every query.
#   hanko            owns the separate `hanko` database used by the Hanko service.
#
# Changing a password in .env later does NOT update the role. Use
#   docker compose exec postgres psql -U postgres -c "alter role croissant_app password '...'"
set -eu

: "${CROISSANT_OWNER_PASSWORD:?must be set}"
: "${CROISSANT_APP_PASSWORD:?must be set}"
: "${HANKO_DB_PASSWORD:?must be set}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname postgres \
  -v owner_pw="$CROISSANT_OWNER_PASSWORD" \
  -v app_pw="$CROISSANT_APP_PASSWORD" \
  -v hanko_pw="$HANKO_DB_PASSWORD" <<'SQL'
create role croissant_owner login password :'owner_pw';
create role croissant_app login password :'app_pw' nobypassrls nocreatedb nocreaterole;
create role hanko login password :'hanko_pw';

create database croissant owner croissant_owner;
create database hanko owner hanko;

revoke all on database croissant from public;
grant connect on database croissant to croissant_app;
revoke all on database hanko from public;
SQL

# Postgres 15+ no longer lets PUBLIC create in the public schema; hand the schema
# to the owner role so migrations can create tables there.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname croissant <<'SQL'
alter schema public owner to croissant_owner;
SQL
