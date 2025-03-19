export default async function handler(req, res) {
    const response = await fetch("https://tv.upstox.com", {
      headers: { "User-Agent": "Mozilla/5.0" ,"X-Forwarded-For": "1.1.1.1" // Spoof an IP}, // Avoid bot blocking
    });
    const data = await response.text();
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(data);
  }
  