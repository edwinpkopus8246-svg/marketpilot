
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  const reply = (statusCode, data) => ({
    statusCode,
    headers,
    body: JSON.stringify(data)
  });

  if (event.httpMethod !== "POST") {
    return reply(405, { error: "POST requests only" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const action = body.action;

    // The existing OAuth token is held by the browser.
    // Send it only over HTTPS. Never log or save it.
    const token = body.access_token;

    if (typeof token !== "string" || !token.trim()) {
      return reply(401, {
        error: "Connect your Deriv account first."
      });
    }

    // Validate requested account type.
    const accountType = body.account_type;

    if (!["demo", "real"].includes(accountType)) {
      return reply(400, {
        error: "Choose demo or real account explicitly."
      });
    }

    // Never allow a real order without a second,
    // explicit confirmation and validated parameters.
    if (action === "buy") {
      if (accountType === "real" &&
          body.confirm_real_trade !== true) {
        return reply(403, {
          error: "Real trade blocked. Explicit confirmation required."
        });
      }

      // Intentionally do not submit an order yet.
      // First implement and test account-specific OTP,
      // authenticated WebSocket, proposal and buy flow.
      return reply(501, {
        error: "Order execution is not implemented yet.",
        live_trading_enabled: false,
        next: "Complete authenticated WebSocket and quote testing first."
      });
    }

    if (!["account", "quote"].includes(action)) {
      return reply(400, {
        error: "Supported actions: account, quote, buy."
      });
    }

    // Verify token by retrieving the user's Options accounts.
    const response = await fetch(
      "https://api.derivws.com/trading/v1/options/accounts",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return reply(response.status, {
        error: "Deriv account verification failed."
      });
    }

    if (action === "account") {
      // Return only basic account identifiers and types.
      const accounts = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.accounts)
          ? result.accounts
          : [];

      return reply(200, {
        verified: true,
        live_trading_enabled: false,
        accounts: accounts.map((account) => ({
          account_id: account.account_id || account.id || null,
          account_type: account.account_type || null,
          currency: account.currency || null
        }))
      });
    }

    return reply(501, {
      verified: true,
      error: "Live quotes require an authenticated WebSocket connection.",
      live_trading_enabled: false
    });
  } catch (error) {
    return reply(400, {
      error: "Request could not be processed."
    });
  }
};
