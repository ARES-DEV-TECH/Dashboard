#!/bin/sh
# Relance le serveur de dev avec un cache .next propre (évite les ENOENT routes-manifest.json)
set -e
cd "$(dirname "$0")/.."
echo "Suppression du cache .next..."
rm -rf .next
echo "Démarrage de next dev..."
exec npm run dev
