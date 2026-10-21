
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: "POST" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const { code, code_verifier, redirect_uri } =
      JSON.parse(event.body || "{}");

    const clientId = process.env.DERIV_CLIENT_ID;
    const expectedRedirect =
      "https://shiny-banoffee-a792f2.netlify.app";

    if (!clientId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "OAuth client ID is not configured in Netlify"
        })
      };
    }

    if (
      typeof code !== "string" ||
      typeof code_verifier !== "string" ||
      redirect_uri !== expectedRedirect
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing or invalid OAuth parameters"
        })
      };
    }

    const form = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      code_verifier,
      redirect_uri: expectedRedirect
    });

    const response = await fetch(
      "https://auth.deriv.com/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form.toString()
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: "Deriv token exchange failed",
          details: result.error_description || result.error || "Request rejected"
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: result.access_token,
        expires_in: result.expires_in,
        token_type: result.token_type
      })
    };
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid request" })
    };
  }
};

