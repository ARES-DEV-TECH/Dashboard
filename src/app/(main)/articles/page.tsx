import { ArticlesContent } from './articles-content'

export default function ArticlesPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Articles</h1>
      <ArticlesContent />
    </div>
  )
}
