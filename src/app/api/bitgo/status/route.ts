import { NextRequest, NextResponse } from "next/server";
import { getPendingApproval } from "@/lib/bitgo";

export async function GET(request: NextRequest) {
  const approvalId = request.nextUrl.searchParams.get("approvalId");

  if (!approvalId) {
    return NextResponse.json(
      { error: "approvalId parameter required" },
      { status: 400 }
    );
  }

  // Handle demo mode approvals
  if (approvalId.startsWith("demo-")) {
    return NextResponse.json({
      id: approvalId,
      state: "pending",
      creator: "agent",
      createDate: new Date().toISOString(),
      info: { type: "transactionRequest" },
      resolvers: [],
      demo: true,
    });
  }

  try {
    const approval = await getPendingApproval(approvalId);
    return NextResponse.json(approval);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch approval status",
      },
      { status: 500 }
    );
  }
}
