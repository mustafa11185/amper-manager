'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Camera, MapPin, Target, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

type ShiftData = {
  check_in_at: string | null
  check_out_at: string | null
  target_subscribers: number
  visited_subscribers: number
}

export default function CollectorBanner() {
  const { data: session } = useSession()
  const [shift, setShift] = useState<ShiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const role = session?.user?.role
  const isCollector = role === 'collector' || (role === 'accountant' && session?.user?.canCollect)

  useEffect(() => {
    if (!isCollector) { setLoading(false); return }

    fetch(`/api/collector/shift/today?staff_id=${(session?.user as any)?.id}`)
      .then(r => r.json())
      .then(data => { setShift(data.shift || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session, isCollector])

  if (!isCollector || loading) return null

  const isCheckedIn = shift?.check_in_at && !shift?.check_out_at
  const needsCheckin = !shift?.check_in_at

  // Check-in banner
  if (needsCheckin) {
    return (
      <div className="bg-gold-soft rounded-2xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <p className="text-sm font-bold text-text-primary mb-2">سجّل حضورك لبدء الجولة</p>
        <button
          onClick={async () => {
            setProcessing(true)
            navigator.geolocation?.getCurrentPosition(
              async (pos) => {
                try {
                  const res = await fetch('/api/collector/check-in', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      gps_lat: pos.coords.latitude,
                      gps_lng: pos.coords.longitude,
                    }),
                  })
                  if (!res.ok) throw new Error()
                  const data = await res.json()
                  setShift(data.shift)
                  toast.success('تم تسجيل الحضور')
                } catch {
                  toast.error('خطأ في تسجيل الحضور')
                }
                setProcessing(false)
              },
              () => {
                toast.error('يرجى تفعيل الموقع')
                setProcessing(false)
              }
            )
          }}
          disabled={processing}
          className="w-full h-10 rounded-xl bg-blue-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {processing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          تسجيل الحضور
        </button>
      </div>
    )
  }

  // Daily target card (only when checked in and target > 0)
  if (isCheckedIn && shift.target_subscribers > 0) {
    const pct = shift.target_subscribers > 0
      ? Math.min(100, (shift.visited_subscribers / shift.target_subscribers) * 100)
      : 0

    return (
      <div className="bg-bg-surface rounded-2xl p-4" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Target size={16} className="text-blue-primary" />
          <p className="text-sm font-bold">الهدف اليومي</p>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">
            أنجزت <span className="font-num font-bold text-text-primary">{shift.visited_subscribers}</span>
            /{shift.target_subscribers}
          </span>
          <span className="font-num text-xs font-bold text-blue-primary">{Math.round(pct)}%</span>
        </div>
        <div className="h-2.5 bg-bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct >= 100 && (
          <p className="text-xs text-success font-bold mt-1.5 text-center">🎉 أحسنت! وصلت للهدف</p>
        )}
      </div>
    )
  }

  return null
}
