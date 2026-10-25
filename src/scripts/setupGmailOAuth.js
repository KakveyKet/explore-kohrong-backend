import "dotenv/config";

import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";

const clientId = String(process.env.GMAIL_CLIENT_ID || "").trim();

const clientSecret = String(process.env.GMAIL_CLIENT_SECRET || "").trim();

if (!clientId || !clientSecret) {
  console.error(
    "Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to your local .env.",
  );
  process.exit(1);
}

const state = randomBytes(24).toString("base64url");
const codeVerifier = randomBytes(64).toString("base64url");

const codeChallenge = createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

let redirectUri;

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (url.pathname !== "/oauth/callback") {
    res.writeHead(404).end("Not found");
    return;
  }

  if (url.searchParams.get("state") !== state) {
    res.writeHead(400).end("Invalid OAuth state");
    return;
  }

  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400).end("Google authorization failed.");
    return;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },

      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),

      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.refresh_token) {
      throw new Error(
        data.error_description || data.error || "No refresh token returned.",
      );
    }

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    res.end("Gmail authorization completed. Return to your terminal.");

    console.log("\nAdd this secret to your backend .env:");

    console.log(`GMAIL_REFRESH_TOKEN=${data.refresh_token}`);

    server.close();
  } catch (error) {
    console.error("Gmail authorization failed:", error.message);

    res.writeHead(500).end("Authorization failed. Check your terminal.");

    server.close();
  }
});

server.listen(0, "127.0.0.1", () => {
  const port = server.address().port;

  redirectUri = `http://127.0.0.1:${port}/oauth/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  }).toString();

  console.log("\nOpen this URL on your Windows PC:\n");

  console.log(authUrl.toString());
});
