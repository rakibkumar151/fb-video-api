export default async function handler(req, res) {
  // CORS setup for testing, though Vercel handles this mostly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { url, method } = req.query;
  
  if (!url) {
    return res.status(400).json({ status: "error", error: "No URL provided" });
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
