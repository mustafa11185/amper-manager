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

  const user = session.user as any;
  if (user.role !== "owner") {
    return NextResponse.json({ error: "المالك فقط" }, { status: 403 });
  }

  const { id } = await params;

  // Delete existing and create new
  await prisma.subscriberPublicToken.deleteMany({
    where: { subscriber_id: id },
  });

  const tokenRecord = await prisma.subscriberPublicToken.create({
    data: { subscriber_id: id },
  });

  return NextResponse.json({ token: tokenRecord.token });
}
