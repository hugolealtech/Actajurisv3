#!/usr/bin/bash
DATA=$(date +%Y-%m-%d_%H-%M)
DESTINO="$HOME/ool-system-v2/backups"
mkdir -p "$DESTINO"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "actajuris-mongo"; then
    docker exec actajuris-mongo mongodump --db actajuris --archive --gzip > "$DESTINO/backup_$DATA.gz"
    echo "✅ Backup via Docker: $DESTINO/backup_$DATA.gz"
else
    mongodump --db actajuris --archive --gzip > "$DESTINO/backup_$DATA.gz" 2>/dev/null \
        && echo "✅ Backup local: $DESTINO/backup_$DATA.gz" \
        || echo "⚠️  mongodump não encontrado. Instale o MongoDB Tools."
fi
ls -t "$DESTINO"/backup_*.gz 2>/dev/null | tail -n +8 | xargs -r rm
echo "🗂️  Backups mantidos: $(ls "$DESTINO"/backup_*.gz 2>/dev/null | wc -l)"
