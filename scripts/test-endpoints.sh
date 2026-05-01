#!/usr/bin/env bash
# Tests de aceptación contra producción.
# Asume que la app está deployada en consultoria-ea.netlify.app
# y que SUPABASE_SERVICE_ROLE_KEY + EMBED_SECRET están configurados en Netlify.

set -e

BASE="https://consultoria-ea.netlify.app"
TOKEN="embed-consultoria-a7x9k2m5p3"
BAD_TOKEN="hackerman-token-fake"
CLIENT_ID="client-dentilandia"
FAKE_TASK="00000000-0000-0000-0000-000000000000"

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
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/$FAKE_TASK/complete")
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo "===> Test 5: POST /api/tasks/:id/complete con token incorrecto -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/$FAKE_TASK/complete?embedToken=$BAD_TOKEN")
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo "===> Test 6: DELETE sin token -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/tasks/$FAKE_TASK")
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo "===> Test 7: DELETE con token pero sin clientId -> 400 (cross-client guard)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/tasks/$FAKE_TASK?embedToken=$TOKEN")
[ "$STATUS" = "400" ] && echo "  OK 400" || { echo "  FAIL esperaba 400, recibi $STATUS"; exit 1; }

echo "===> Test 8: DELETE con token y clientId pero task inexistente -> 404"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/tasks/$FAKE_TASK?embedToken=$TOKEN&clientId=$CLIENT_ID")
[ "$STATUS" = "404" ] && echo "  OK 404" || { echo "  FAIL esperaba 404, recibi $STATUS"; exit 1; }

echo "===> Test 9: PATCH con token pero sin clientId -> 400 (cross-client guard)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/api/tasks/$FAKE_TASK?embedToken=$TOKEN" -H "Content-Type: application/json" -d '{}')
[ "$STATUS" = "400" ] && echo "  OK 400" || { echo "  FAIL esperaba 400, recibi $STATUS"; exit 1; }

echo "===> Test 10: complete con token pero sin clientId -> 400 (cross-client guard)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/$FAKE_TASK/complete?embedToken=$TOKEN")
[ "$STATUS" = "400" ] && echo "  OK 400" || { echo "  FAIL esperaba 400, recibi $STATUS"; exit 1; }

echo
echo "===> Todos los tests de aceptacion pasaron"
