UPDATE agent_cards
SET classification_json = json_set(
  classification_json,
  '$.cloudflareReady.confidence',
  'high',
  '$.cloudflareReady.evidence',
  json('["No Cloudflare deployment signal detected.","No wrangler.toml found in inspected repository files."]')
)
WHERE cloudflare_ready = 0
  AND json_extract(classification_json, '$.cloudflareReady.confidence') = 'low'
  AND json_extract(classification_json, '$.cloudflareReady.evidence[0]') = 'No Cloudflare deployment signal detected.';
