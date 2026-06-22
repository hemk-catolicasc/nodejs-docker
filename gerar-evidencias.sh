#!/usr/bin/env bash
# Gera as 4 evidências de texto exigidas pelo trabalho.
# Pré-requisito: a stack precisa estar no ar (docker compose up -d).
# Uso (Git Bash / Linux / macOS):  bash gerar-evidencias.sh
set -e

mkdir -p evidencias

docker ps                  > evidencias/docker-ps.txt
docker stats --no-stream   > evidencias/docker-stats.txt
docker inspect so_web      > evidencias/docker-inspect-app.txt
docker logs so_web         > evidencias/logs-app.txt

echo "Evidências geradas em ./evidencias (falta apenas o print-navegador.png)."
