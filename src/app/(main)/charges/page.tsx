import dynamic from 'next/dynamic'
import ChargesLoading from './loading'

const ChargesContent = dynamic(
  () => import('./charges-content').then((m) => ({ default: m.ChargesContent })),
  { loading: () => <ChargesLoading /> }
)

export default function ChargesPage() {
  return <ChargesContent />
}
