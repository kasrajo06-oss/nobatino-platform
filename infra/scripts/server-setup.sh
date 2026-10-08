#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04/24.04 server (run as root):
#   bash infra/scripts/server-setup.sh
# Installs Docker from Ubuntu's own repositories (reachable through Iranian Ubuntu mirrors),
# configures a Docker Hub mirror, and opens the firewall ports the stack needs.
set -euo pipefail

DOCKER_MIRROR="${DOCKER_MIRROR:-https://docker.arvancloud.ir}"

apt-get update
apt-get install -y docker.io docker-compose-v2 git ufw openssl curl

mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<JSON
{
  "registry-mirrors": ["${DOCKER_MIRROR}"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" }
}
JSON
systemctl enable --now docker
systemctl restart docker

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 49160:49200/udp
ufw --force enable

docker --version
docker compose version
echo "Server ready. Next: cd infra && cp .env.example .env && nano .env && ./scripts/deploy.sh"
