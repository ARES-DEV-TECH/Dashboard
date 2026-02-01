'use client'

import 'sonner/dist/styles.css'
import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      theme="dark"
      richColors
      closeButton
      visibleToasts={3}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'font-sans !border-border',
        },
      }}
      style={{ zIndex: 999999 }}
    />
  )
}
