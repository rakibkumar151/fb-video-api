export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  
  // Extract the part after /_hf_api
  const targetPathAndQuery = url.pathname.replace(/^\/_hf_api/, '') + url.search;
  
  const targetUrl = new URL(targetPathAndQuery, 'https://rasrdaa-video-api-fast.hf.space');

  const headers = new Headers(req.headers);
  
  // Add Hugging Face Authorization header for private Space
  const hfToken = process.env.HF_TOKEN;
  if (hfToken) {
    headers.set('Authorization', `Bearer ${hfToken}`);
  }

  // Remove headers that might cause issues when proxying
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'manual'
    });

    // Create a new response to stream the body back
    const responseHeaders = new Headers(response.headers);
    // Allow CORS if necessary
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
