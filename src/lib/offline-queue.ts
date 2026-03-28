import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'amper-offline'
const STORE_NAME = 'payment-queue'
const DB_VERSION = 1

export type OfflinePayment = {
  id?: number
  subscriber_id: string
  subscriber_name: string
  amount: number
  payment_method: string
  gps_lat: number | null
  gps_lng: number | null
  created_at: string
  synced: boolean
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    },
  })
}

export async function queuePayment(payment: Omit<OfflinePayment, 'id' | 'synced'>) {
  const db = await getDB()
  await db.add(STORE_NAME, { ...payment, synced: false })
}

export async function getPendingPayments(): Promise<OfflinePayment[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all.filter((p: OfflinePayment) => !p.synced)
}

export async function markSynced(id: number) {
  const db = await getDB()
  const item = await db.get(STORE_NAME, id)
  if (item) {
    item.synced = true
    await db.put(STORE_NAME, item)
  }
}

export async function syncOfflinePayments() {
  const pending = await getPendingPayments()
  for (const payment of pending) {
    try {
      const res = await fetch('/api/pos/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriber_id: payment.subscriber_id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          gps_lat: payment.gps_lat,
          gps_lng: payment.gps_lng,
        }),
      })
      if (res.ok && payment.id) {
        await markSynced(payment.id)
      }
    } catch {
      // Still offline — will retry next sync
      break
    }
  }
}
