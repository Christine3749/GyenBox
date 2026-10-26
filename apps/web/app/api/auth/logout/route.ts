import { NextResponse } from "next/server"
import { clearSession } from "@/lib/hs-session"
export async function POST() { await clearSession(); return NextResponse.json({ session: null }) }
