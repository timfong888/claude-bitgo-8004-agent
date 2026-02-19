import { NextResponse } from "next/server";
import { getWallet } from "@/lib/bitgo";

export async function GET() {
  try {
    const wallet = await getWallet();
    return NextResponse.json({
      id: wallet.id,
      label: wallet.label,
      address: wallet.receiveAddress?.address || wallet.coinSpecific?.baseAddress || null,
      coin: wallet.coin,
    });
  } catch {
    return NextResponse.json(
      { address: null, demo: true, note: "BitGo not configured" },
      { status: 200 }
    );
  }
}
