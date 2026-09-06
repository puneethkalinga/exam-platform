export default async function handler(req, res) {
  const reqUrl = req.url || "/";
  const targetPath = reqUrl.startsWith("/api") ? reqUrl : `/api${reqUrl}`;
  const targetUrl = `https://exam-platform-qhk8.onrender.com${targetPath}`;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (key.toLowerCase() !== "host") {
      headers[key] = value;
    }
  }
  // Set origin to an allowed origin on the Render backend
  headers["origin"] = "https://exam-platform-inky-nine.vercel.app";

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body) {
        fetchOptions.body = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);
    response.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (!["content-encoding", "transfer-encoding", "content-length"].includes(lowerKey)) {
        res.setHeader(key, val);
      }
    });

    const data = await response.arrayBuffer();
    res.send(Buffer.from(data));
  } catch (err) {
    console.error("Proxy error:", err);
    if (!res.headersSent) {
      res.status(502).json({ message: "Server is waking up. Please wait 10 seconds and try again." });
    }
  }
}
