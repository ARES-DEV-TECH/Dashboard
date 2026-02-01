interface PageLayoutProps {
  /** Titre de la page (h1). Si absent, aucun titre n’est affiché. */
  title?: string
  /** Masquer le titre tout en gardant le wrapper (ex. page Paramètres). */
  showTitle?: boolean
  children: React.ReactNode
  className?: string
}

export function PageLayout({
  title,
  showTitle = true,
  children,
  className = '',
}: PageLayoutProps) {
  return (
    <div
      className={`w-full min-w-0 py-4 sm:py-6 space-y-4 sm:space-y-6 ${className}`.trim()}
    >
      {title && showTitle ? (
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {title}
        </h1>
      ) : null}
      {children}
    </div>
  )
}
