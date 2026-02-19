const BITGO_BASE_URL =
  process.env.BITGO_ENV === "prod"
    ? "https://app.bitgo.com"
    : "https://app.bitgo-test.com";

const BITGO_COIN = process.env.BITGO_COIN || "hteth"; // Holesky testnet ETH; may be tsep for Sepolia
const BITGO_WALLET_ID = process.env.BITGO_WALLET_ID || "";

function getHeaders(): Record<string, string> {
  const token = process.env.BITGO_ACCESS_TOKEN;
  if (!token) throw new Error("BITGO_ACCESS_TOKEN not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Create a transaction request
export async function createTransactionRequest(params: {
  to: string;
  data: string;
  value: string;
  comment?: string;
}) {
  const url = `${BITGO_BASE_URL}/api/v2/${BITGO_COIN}/wallet/${BITGO_WALLET_ID}/txrequests`;
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      intent: {
        intentType: "payment",
        recipients: [
          {
            address: params.to,
            amount: { value: params.value, symbol: BITGO_COIN },
          },
        ],
        memo: params.comment,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BitGo createTxRequest failed: ${response.status} ${error}`);
  }

  return response.json();
}

// List pending approvals
export async function listPendingApprovals() {
  const url = `${BITGO_BASE_URL}/api/v2/pendingapprovals?walletId=${BITGO_WALLET_ID}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `BitGo listPendingApprovals failed: ${response.status} ${error}`
    );
  }

  return response.json();
}

// Get a specific pending approval
export async function getPendingApproval(approvalId: string) {
  const url = `${BITGO_BASE_URL}/api/v2/pendingapprovals/${approvalId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `BitGo getPendingApproval failed: ${response.status} ${error}`
    );
  }

  return response.json();
}

// Update (approve/reject) a pending approval
export async function updatePendingApproval(
  approvalId: string,
  state: "approved" | "rejected",
  otp?: string
) {
  const url = `${BITGO_BASE_URL}/api/v2/pendingapprovals/${approvalId}`;
  const body: Record<string, string> = { state };
  if (otp) body.otp = otp;

  const response = await fetch(url, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `BitGo updatePendingApproval failed: ${response.status} ${error}`
    );
  }

  return response.json();
}

// Add a webhook to the wallet
export async function addWalletWebhook(webhookUrl: string) {
  const url = `${BITGO_BASE_URL}/api/v2/${BITGO_COIN}/wallet/${BITGO_WALLET_ID}/webhooks`;
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      type: "pendingapproval",
      url: webhookUrl,
      numConfirmations: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `BitGo addWebhook failed: ${response.status} ${error}`
    );
  }

  return response.json();
}

// Get wallet info (useful for determining coin type, balance)
export async function getWallet() {
  const url = `${BITGO_BASE_URL}/api/v2/${BITGO_COIN}/wallet/${BITGO_WALLET_ID}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BitGo getWallet failed: ${response.status} ${error}`);
  }

  return response.json();
}

export { BITGO_BASE_URL, BITGO_COIN, BITGO_WALLET_ID };
