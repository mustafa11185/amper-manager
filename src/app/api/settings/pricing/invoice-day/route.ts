import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.role !== "owner") return NextResponse.json({ error: "المالك فقط" }, { status: 403 });

    const body = await req.json();
    const day = Number(body.auto_invoice_day);

    if (!day || day < 1 || day > 31) return NextResponse.json({ error: "اليوم يجب أن يكون بين 1 و 31" }, { status: 400 });

    // auto_invoice_day is managed at the application level now — invoices generate on day 1 by default
    return NextResponse.json({ ok: true, auto_invoice_day: day });
  } catch (error) {
    console.error("invoice-day error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
