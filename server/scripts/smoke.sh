#!/usr/bin/env bash
# Smoke test ponta a ponta contra uma API em execução (padrão: http://localhost:4000).
# Uso: API_URL=http://localhost:4000 bash scripts/smoke.sh
set -euo pipefail
API="${API_URL:-http://localhost:4000}"
EMAIL="smoke-$(date +%s)-$RANDOM@teste.liberar"
PASS="Senha123"
QUIT=$(node -e 'const d=new Date();d.setDate(d.getDate()-10);console.log(d.toISOString())')
TODAY=$(node -e 'const d=new Date();console.log(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`)')
NOW=$(node -e 'console.log(new Date().toISOString())')
pass() { printf '  \033[32m✔\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✘\033[0m %s\n' "$1"; exit 1; }
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);const p=process.argv[1].split(".");let v=o;for(const k of p){v=v?.[k]}console.log(typeof v==="object"?JSON.stringify(v):v)})' "$1"; }
req() { # method path [body] [token]
  local m=$1 p=$2 b=${3:-} t=${4:-}
  local args=(-s -m 20 -X "$m" "$API$p" -H 'content-type: application/json')
  [ -n "$t" ] && args+=(-H "authorization: Bearer $t")
  [ -n "$b" ] && args+=(--data "$b")
  curl "${args[@]}"
}
code() { # method path [body] [token] -> http code
  local m=$1 p=$2 b=${3:-} t=${4:-}
  local args=(-s -o /dev/null -w '%{http_code}' -m 20 -X "$m" "$API$p" -H 'content-type: application/json')
  [ -n "$t" ] && args+=(-H "authorization: Bearer $t")
  [ -n "$b" ] && args+=(--data "$b")
  curl "${args[@]}"
}

echo "Smoke test LiberAr API em $API"
[ "$(req GET /health | json status)" = "ok" ] && pass "GET /health" || fail "health"
[ "$(req POST /auth/check-email "{\"email\":\"$EMAIL\"}" | json available)" = "true" ] && pass "check-email disponível" || fail "check-email"

REG=$(req POST /auth/register "{\"name\":\"Smoke Teste\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"acceptedTerms\":true,\"profile\":{\"quitDate\":\"$QUIT\",\"cigsPerDay\":15,\"packPrice\":12.5,\"cigsPerPack\":20,\"usageType\":\"cigarro\",\"stopMethod\":\"abrupto\",\"tourDone\":true}}")
TOKEN=$(echo "$REG" | json accessToken); REFRESH=$(echo "$REG" | json refreshToken)
[ "${#TOKEN}" -gt 20 ] && pass "register → tokens + snapshot (dias=$(echo "$REG" | json snapshot.progress.days))" || fail "register: $REG"
DUP_BODY="{\"name\":\"Duplicado\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"acceptedTerms\":true,\"profile\":{\"quitDate\":\"$QUIT\",\"cigsPerDay\":1,\"packPrice\":1,\"cigsPerPack\":20}}"
DUP_CODE=$(code POST /auth/register "$DUP_BODY")
[ "$DUP_CODE" = "409" ] && pass "register duplicado → 409" || fail "register duplicado devolveu $DUP_CODE"
BAD_LOGIN=$(code POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"errada1\"}")
[ "$BAD_LOGIN" = "401" ] && pass "login senha errada → 401" || fail "login errado devolveu $BAD_LOGIN"
LOGIN=$(req POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"); TOKEN=$(echo "$LOGIN" | json accessToken); REFRESH=$(echo "$LOGIN" | json refreshToken)
[ "$(echo "$LOGIN" | json snapshot.user.email)" = "$EMAIL" ] && pass "login ok" || fail "login"
NEWPAIR=$(req POST /auth/refresh "{\"refreshToken\":\"$REFRESH\"}"); TOKEN=$(echo "$NEWPAIR" | json accessToken); REFRESH2=$(echo "$NEWPAIR" | json refreshToken)
[ "${#REFRESH2}" -gt 20 ] && pass "refresh rotacionou" || fail "refresh"
OLD_REFRESH=$(code POST /auth/refresh "{\"refreshToken\":\"$REFRESH\"}")
[ "$OLD_REFRESH" = "401" ] && pass "refresh antigo revogado → 401" || fail "refresh antigo devolveu $OLD_REFRESH"
[ "$(code GET /me)" = "401" ] && pass "GET /me sem token → 401" || fail "401 me"
[ "$(req GET /me '' "$TOKEN" | json profile.cigsPerDay)" = "15" ] && pass "GET /me" || fail "me"
[ "$(req PATCH /me/profile '{"reminderEnabled":true,"reminderHour":21}' "$TOKEN" | json reminderHour)" = "21" ] && pass "PATCH /me/profile" || fail "patch"
CI1="{\"date\":\"$NOW\",\"mood\":\"good\",\"smoked\":false,\"cigarettes\":0,\"craving\":2,\"symptoms\":[\"Ansiedade\"]}"
[ "$(req PUT "/me/checkins/$TODAY" "$CI1" "$TOKEN" | json craving)" = "2" ] && pass "PUT check-in" || fail "checkin"
CI2="{\"date\":\"$NOW\",\"mood\":\"hard\",\"smoked\":true,\"cigarettes\":2,\"craving\":4}"
[ "$(req PUT "/me/checkins/$TODAY" "$CI2" "$TOKEN" | json cigarettes)" = "2" ] && pass "PUT check-in (mesmo dia substitui)" || fail "checkin2"
[ "$(req GET /me/checkins '' "$TOKEN" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')" = "1" ] && pass "GET check-ins = 1" || fail "checkins count"
[ "$(req GET /me/progress '' "$TOKEN" | json progress.days)" = "10" ] && pass "GET /me/progress dias=10" || fail "progress"
REL=$(req POST /me/relapse '{}' "$TOKEN")
[ "$(echo "$REL" | json cycles.0.label)" = "Ciclo 1" ] && pass "POST /me/relapse → Ciclo 1 ($(echo "$REL" | json cycles.0.days) dias)" || fail "relapse: $REL"
[ "$(req GET /me/progress '' "$TOKEN" | json progress.days)" = "0" ] && pass "cronômetro reiniciado (dias=0)" || fail "progress após recaída"
[ "$(req PUT /me/fagerstrom '{"score":6,"label":"Alta","date":"27/10/2026"}' "$TOKEN" | json score)" = "6" ] && pass "PUT fagerstrom" || fail "fagerstrom"
[ "$(req PUT /me/treatment '{"viaApp":true,"ubs":"UBS Centro","professional":"Dra. Ana","startDate":"2026-10-20","adesivo":"21mg","oral":null,"med":null,"adherence":"total","sideEffects":["Insônia"],"notes":"ok"}' "$TOKEN" | json ubs)" = "UBS Centro" ] && pass "PUT treatment" || fail "treatment"
TRIG="{\"date\":\"$NOW\",\"place\":\"Casa\",\"emotion\":\"Tédio\",\"people\":\"Sozinho(a)\",\"intensity\":3,\"gaveIn\":false,\"note\":\"\"}"
TRIG_CODE=$(code POST /me/triggers "$TRIG" "$TOKEN")
[ "$TRIG_CODE" = "201" ] && pass "POST trigger → 201" || fail "trigger devolveu $TRIG_CODE"
CHAT=$(req POST /me/chat/messages '{"text":"estou com fissura agora"}' "$TOKEN")
[ -n "$(echo "$CHAT" | json assistantMessage.text)" ] && pass "chat → fonte=$(echo "$CHAT" | json source)" || fail "chat: $CHAT"
CRISIS=$(req POST /me/chat/messages '{"text":"não aguento mais, quero me matar"}' "$TOKEN")
[ "$(echo "$CRISIS" | json crisis)" = "true" ] && pass "chat crise → guardrail com CVV" || fail "crise: $CRISIS"
[ "$(req GET /me/chat '' "$TOKEN" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).messages.length))')" = "4" ] && pass "histórico do chat = 4 mensagens" || fail "chat hist"
[ "$(req GET '/health-units?kind=CAPS' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log(a.length>0&&a.every(u=>u.kind==="CAPS"))})')" = "true" ] && pass "GET /health-units?kind=CAPS" || fail "units"
[ "$(req GET '/health-units?q=centro' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length>0))')" = "true" ] && pass "GET /health-units?q=centro" || fail "units q"
[ "$(req GET /me/export '' "$TOKEN" | json user.email)" = "$EMAIL" ] && pass "GET /me/export" || fail "export"
FORGOT=$(code POST /auth/forgot-password "{\"email\":\"$EMAIL\"}")
[ "$FORGOT" = "202" ] && pass "forgot-password → 202 (código no console da API)" || fail "forgot devolveu $FORGOT"
LOGOUT=$(code POST /auth/logout "{\"refreshToken\":\"$REFRESH2\"}")
[ "$LOGOUT" = "204" ] && pass "logout → 204" || fail "logout devolveu $LOGOUT"
DEL=$(code DELETE /me "" "$TOKEN")
[ "$DEL" = "204" ] && pass "DELETE /me → 204 (LGPD)" || fail "delete devolveu $DEL"
AFTER=$(code POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
[ "$AFTER" = "401" ] && pass "login após exclusão → 401" || fail "login pós delete devolveu $AFTER"
echo "Tudo certo."
