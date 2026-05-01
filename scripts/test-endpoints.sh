#!/usr/bin/env bash
# Tests de aceptación contra producción.
# Asume que la app está deployada en consultoria-ea.netlify.app
# y que SUPABASE_SERVICE_ROLE_KEY + EMBED_SECRET están configurados en Netlify.

set -e

BASE="https://consultoria-ea.netlify.app"
TOKEN="embed-consultoria-a7x9k2m5p3"
BAD_TOKEN="hackerman-token-fake"
CLIENT_ID="client-dentilandia"

echo "===> Test 1: GET /api/tasks sin token -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tasks?clientId=$CLIENT_ID")
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo "===> Test 2: GET /api/tasks con token valido -> 200"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tasks?clientId=$CLIENT_ID&embedToken=$TOKEN")
[ "$STATUS" = "200" ] && echo "  OK 200" || { echo "  FAIL esperaba 200, recibi $STATUS"; exit 1; }

echo "===> Test 3: GET /api/tasks/responsables con token -> 200 + lista no vacia"
RESP=$(curl -s "$BASE/api/tasks/responsables?clientId=$CLIENT_ID&embedToken=$TOKEN")
echo "  -> $(echo "$RESP" | head -c 200)"
echo "$RESP" | grep -q '"responsables":\[' && echo "  OK formato" || { echo "  FAIL formato inesperado"; exit 1; }

echo "===> Test 4: POST /api/tasks/:id/complete sin token -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/00000000-0000-0000-0000-000000000000/complete")
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo "===> Test 5: POST /api/tasks/:id/complete con token incorrecto -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/00000000-0000-0000-0000-000000000000/complete?embedToken=$BAD_TOKEN")
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo "===> Test 6: DELETE sin token -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/tasks/00000000-0000-0000-0000-000000000000")
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo
echo "===> Todos los tests de aceptacion pasaron"
