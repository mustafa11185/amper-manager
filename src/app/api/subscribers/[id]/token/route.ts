import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Find or create token
  let tokenRecord = await prisma.subscriberPublicToken.findUnique({
    where: { subscriber_id: id },
  });

  if (!tokenRecord) {
    tokenRecord = await prisma.subscriberPublicToken.create({
      data: { subscriber_id: id },
    });
  }

  return NextResponse.json({ token: tokenRecord.token });
}
