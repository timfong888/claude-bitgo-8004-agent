import { NextResponse } from "next/server";
import { getWallet } from "@/lib/bitgo";

export async function GET() {
  try {
    const wallet = await getWallet();

    // Balance comes in base units (wei) as a string
    const balanceWei = wallet.balanceString || wallet.balance || "0";
    const balanceETH = (Number(balanceWei) / 1e18).toFixed(6);
    const spendableWei = wallet.spendableBalanceString || wallet.spendableBalance || "0";
    const spendableETH = (Number(spendableWei) / 1e18).toFixed(6);

    return NextResponse.json({
      id: wallet.id,
      label: wallet.label,
      address: wallet.receiveAddress?.address || wallet.coinSpecific?.baseAddress || null,
      coin: wallet.coin,
      balanceETH,
      spendableETH,
    });
  } catch {
    return NextResponse.json(
      { address: null, demo: true, note: "BitGo not configured" },
      { status: 200 }
    );
  }
}
