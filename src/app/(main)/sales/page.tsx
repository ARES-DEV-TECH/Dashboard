'use client'

import { SalesContent } from './sales-content'

export default function SalesPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Ventes</h1>
      <SalesContent />
    </div>
  )
}
