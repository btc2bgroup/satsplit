#!/usr/bin/env bash
# Scan Caddy access logs for AI/LLM crawler hits.
#
# Usage:
#   scripts/llm-citations.sh                    # last 24h from `docker compose logs frontend`
#   scripts/llm-citations.sh --since 7d         # last 7 days
#   scripts/llm-citations.sh --file access.log  # parse a saved log file instead
#
# Distinguishes:
#   [training]  bots that scrape for model training / search indexing
#   [retrieval] bots that fetch live during a user's chat — strong citation signal

set -euo pipefail

SINCE="24h"
FILE=""

while [[ $# -gt 0 ]]; do
	case "$1" in
		--since) SINCE="$2"; shift 2 ;;
		--file)  FILE="$2"; shift 2 ;;
		-h|--help)
			grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
		*) echo "unknown arg: $1" >&2; exit 1 ;;
	esac
done

# Live retrieval — these mean an LLM is fetching the page to answer a user RIGHT NOW.
RETRIEVAL='ChatGPT-User|OAI-SearchBot|Perplexity-User|PerplexityBot|Claude-User|Claude-SearchBot|Gemini-User|Bingbot.*Copilot|Applebot-Extended'

# Training / indexing crawlers.
TRAINING='GPTBot|ClaudeBot|anthropic-ai|CCBot|Google-Extended|Bytespider|Amazonbot|cohere-ai|Diffbot|FacebookBot|meta-externalagent|YouBot'

ALL_RE="$RETRIEVAL|$TRAINING"

if [[ -n "$FILE" ]]; then
	SOURCE_CMD=(cat "$FILE")
else
	# docker compose --since accepts Go durations (h/m/s) or timestamps — translate Nd → (N*24)h.
	if [[ "$SINCE" =~ ^([0-9]+)d$ ]]; then
		SINCE="$(( ${BASH_REMATCH[1]} * 24 ))h"
	fi
	SOURCE_CMD=(docker compose logs --since "$SINCE" --no-color frontend)
fi

# Each Caddy JSON line has request.headers["User-Agent"][0], request.uri, status, ts.
# Fall back to grep-only mode if jq is missing.
if ! command -v jq >/dev/null 2>&1; then
	echo "jq not found — falling back to plain grep counts." >&2
	"${SOURCE_CMD[@]}" | grep -Eo "($ALL_RE)" | sort | uniq -c | sort -rn
	exit 0
fi

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

"${SOURCE_CMD[@]}" \
	| grep -Eo '\{.*\}' \
	| jq -rc --arg re "$ALL_RE" '
		select(.request.headers["User-Agent"][0]? | test($re; "i"))
		| [
			.ts,
			.request.headers["User-Agent"][0],
			.request.uri,
			(.status|tostring)
		] | @tsv' > "$TMP" || true

TOTAL=$(wc -l < "$TMP" | tr -d ' ')
echo "AI/LLM crawler hits in window: $TOTAL"
echo

if [[ "$TOTAL" -eq 0 ]]; then
	echo "No AI crawler activity detected. (If you just enabled Caddy logs, give it some time.)"
	exit 0
fi

classify() {
	awk -v ret="$RETRIEVAL" -v trn="$TRAINING" -F'\t' '
	{
		ua=$2
		kind = (ua ~ ret) ? "retrieval" : "training"
		print kind"\t"$0
	}' "$TMP"
}

echo "── By bot (retrieval = strongest citation signal) ──"
classify | awk -F'\t' '
{
	ua=$3
	bot="other"
	if (match(ua, /ChatGPT-User|OAI-SearchBot|Perplexity-User|PerplexityBot|Claude-User|Claude-SearchBot|Gemini-User|GPTBot|ClaudeBot|anthropic-ai|CCBot|Google-Extended|Bytespider|Amazonbot|cohere-ai|Diffbot|FacebookBot|meta-externalagent|YouBot|Applebot-Extended/)) {
		bot=substr(ua, RSTART, RLENGTH)
	}
	c[$1"\t"bot]++
}
END {
	for (k in c) {
		split(k, parts, "\t")
		printf "%-10s %-25s %d\n", parts[1], parts[2], c[k]
	}
}
' | sort -k1,1 -k3,3rn

echo
echo "── Top paths hit by AI crawlers ──"
awk -F'\t' '{c[$3]++} END {for (p in c) printf "%5d  %s\n", c[p], p}' "$TMP" | sort -rn | head -20

echo
echo "── Most recent retrieval-bot hits (last 10) ──"
classify | awk -F'\t' '$1=="retrieval" {print}' | tail -10 | \
	awk -F'\t' '{printf "%s  %s  %s\n", $2, $4, $3}'