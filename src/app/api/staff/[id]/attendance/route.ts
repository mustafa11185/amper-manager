import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const searchParams = req.nextUrl.searchParams;
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const staff = await prisma.staff.findUnique({
    where: { id },
    select: { role: true },
  });

  if (!staff) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (staff.role === "collector") {
    const shifts = await prisma.collectorShift.findMany({
      where: {
        staff_id: id,
        shift_date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { shift_date: "asc" },
    });

    const attended = shifts.filter((s) => s.check_in_at).length;
    const totalDays = shifts.length;
    const lateShifts = shifts.filter((s) => s.late_minutes > 0);
    const avgLate =
      lateShifts.length > 0
        ? Math.round(
            lateShifts.reduce((a, s) => a + s.late_minutes, 0) / lateShifts.length
          )
        : 0;
    const totalLateMin = lateShifts.reduce((a, s) => a + s.late_minutes, 0);

    return NextResponse.json({
      attended,
      total_days: totalDays,
      late_count: lateShifts.length,
      avg_late_minutes: avgLate,
      total_late_minutes: totalLateMin,
      shifts: shifts.map((s) => ({
        date: s.shift_date,
        check_in: s.check_in_at,
        check_out: s.check_out_at,
        hours_worked: s.hours_worked ? Number(s.hours_worked) : null,
        late_minutes: s.late_minutes,
      })),
    });
  }

  if (staff.role === "operator") {
    const shifts = await prisma.operatorShift.findMany({
      where: {
        staff_id: id,
        shift_date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { shift_date: "asc" },
    });

    const attended = shifts.filter((s) => s.check_in_at).length;
    const totalDays = shifts.length;

    return NextResponse.json({
      attended,
      total_days: totalDays,
      late_count: 0,
      avg_late_minutes: 0,
      total_late_minutes: 0,
      shifts: shifts.map((s) => ({
        date: s.shift_date,
        check_in: s.check_in_at,
        check_out: s.check_out_at,
        hours_worked: s.hours_worked ? Number(s.hours_worked) : null,
        late_minutes: 0,
      })),
    });
  }

  return NextResponse.json({ error: "Invalid role" }, { status: 400 });
}
