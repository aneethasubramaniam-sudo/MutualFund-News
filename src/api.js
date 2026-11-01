export async function callAgent(path, body, settings) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-openai-key': settings.openaiKey.trim(),
      'x-serp-key': settings.serpKey.trim(),
      'x-model': settings.model.trim(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
