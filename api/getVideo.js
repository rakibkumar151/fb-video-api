export default async function handler(req, res) {
  // CORS setup for testing, though Vercel handles this mostly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { url, method, cf_token } = req.query;
  
  if (!url) {
    return res.status(400).json({ status: "error", error: "No URL provided" });
  }

  // Cloudflare Turnstile Verification
  if (!cf_token) {
    return res.status(403).json({ status: "error", error: "Security validation failed. Bot detected." });
  }

  const cfSecretKey = process.env.CF_SECRET_KEY || "0x4AAAAAAC8lKLs4ZL9e50Xu6yXb6wa-T8A";
  
  const cfFormData = new URLSearchParams();
  cfFormData.append("secret", cfSecretKey);
  cfFormData.append("response", cf_token);

  try {
    const cfReq = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: cfFormData
    });
    const cfResult = await cfReq.json();
    if (!cfResult.success) {
      return res.status(403).json({ status: "error", error: "Cloudflare Captcha Verification Failed. Bot detected." });
    }
  } catch (error) {
    return res.status(500).json({ status: "error", error: "Failed to verify security token." });
  }

  let apiUrl = "";
  
  // Decide which backend API to call based on the frontend's choice
  if (method === "fast") {
    // Hidden Hugging Face API with the secret API Key (never exposed to browser)
    const apiKey = process.env.HD_API_KEY || "vercel_secret_key_123";
    apiUrl = `https://tools131313-video-api-fast.hf.space/get_video?url=${encodeURIComponent(url)}&api_key=${apiKey}`;
  } else {
    // Default/Medium Render API
    apiUrl = `https://videoapi-c4eq.onrender.com/get_video?url=${encodeURIComponent(url)}`;
  }

  try {
    const fetchRes = await fetch(apiUrl);
    const data = await fetchRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
}
