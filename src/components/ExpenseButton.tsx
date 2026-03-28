'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Fuel, Droplets, Wrench, Users, Home, MoreHorizontal, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { id: 'وقود', label: 'وقود', icon: Fuel },
  { id: 'زيت', label: 'زيت', icon: Droplets },
  { id: 'صيانة', label: 'صيانة', icon: Wrench },
  { id: 'رواتب', label: 'رواتب', icon: Users },
  { id: 'إيجار', label: 'إيجار', icon: Home },
  { id: 'أخرى', label: 'أخرى', icon: MoreHorizontal },
] as const

export default function ExpenseButton({ branchId }: { branchId?: string }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resolvedBranchId, setResolvedBranchId] = useState(branchId || '')

  useEffect(() => {
    if (!branchId) {
      fetch('/api/branches')
        .then(r => r.json())
        .then(data => {
          if (data.branches?.length > 0) {
            setResolvedBranchId(data.branches[0].id)
          }
        })
        .catch(() => {})
    }
  }, [branchId])

  function reset() {
    setCategory('')
    setAmount('')
    setDescription('')
  }

  async function handleSubmit() {
    if (!category) { toast.error('اختر صنف المصروف'); return }
    if (!amount || Number(amount) <= 0) { toast.error('أدخل المبلغ'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          amount: Number(amount),
          description: description || undefined,
          branch_id: resolvedBranchId || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'خطأ')
      }

      toast.success('تم تسجيل المصروف')
      reset()
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'خطأ في تسجيل المصروف')
    }
    setSubmitting(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-40 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1B4FD8, #7C3AED)' }}
      >
        <Plus size={22} />
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setOpen(false); reset() }}
          />

          {/* Sheet */}
          <div
            className="relative w-full max-w-md bg-bg-surface rounded-t-2xl p-5 pb-8 animate-slide-up"
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Handle */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">+ مصروف جديد</h3>
              <button onClick={() => { setOpen(false); reset() }} className="p-1">
                <X size={18} className="text-text-muted" />
              </button>
            </div>

            {/* Category chips */}
            <p className="text-xs text-text-muted mb-2">الصنف</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isActive = category === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-primary text-white'
                        : 'bg-bg-muted text-text-secondary hover:bg-border'
                    }`}
                  >
                    <Icon size={13} />
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* Amount */}
            <p className="text-xs text-text-muted mb-1">المبلغ</p>
            <div className="relative mb-3">
              <input
                type="number"
                inputMode="numeric"
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-3 rounded-xl bg-bg-muted border border-border text-left font-num font-bold text-lg focus:outline-none focus:border-blue-primary"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                د.ع
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-text-muted mb-1">ملاحظات (اختياري)</p>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: وقود المولدة الرئيسية"
              className="w-full h-10 px-3 rounded-xl bg-bg-muted border border-border text-sm focus:outline-none focus:border-blue-primary mb-4"
            />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1B4FD8, #7C3AED)' }}
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'تسجيل المصروف'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
