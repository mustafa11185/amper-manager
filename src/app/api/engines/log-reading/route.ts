import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, value, engine_id, branch_id } = await req.json();

  if (!type || value === undefined || !engine_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (type === "temperature") {
    await prisma.temperatureLog.create({
      data: { engine_id, temp_celsius: value },
    });
  } else if (type === "fuel") {
    await prisma.fuelLog.create({
      data: { engine_id, fuel_level_percent: value, source: "manual" },
    });
    // Also update generator fuel_level_pct
    const engine = await prisma.engine.findUnique({ where: { id: engine_id } });
    if (engine) {
      await prisma.generator.update({
        where: { id: engine.generator_id },
        data: { fuel_level_pct: value, last_fuel_update: new Date() },
      });
    }
  } else if (type === "oil_pressure") {
    await prisma.oilPressureLog.create({
      data: {
        engine_id,
        branch_id: branch_id || "",
        pressure_bar: value,
        source: "manual",
      },
    });
  } else if (type === "load") {
    await prisma.loadLog.create({
      data: {
        engine_id,
        branch_id: branch_id || "",
        load_ampere: value,
        source: "manual",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
