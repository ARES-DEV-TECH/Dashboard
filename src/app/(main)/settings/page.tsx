import dynamic from 'next/dynamic'
import SettingsLoading from './loading'

const SettingsContent = dynamic(
  () => import('./settings-content').then((m) => ({ default: m.SettingsContent })),
  { loading: () => <SettingsLoading /> }
)

export default function SettingsPage() {
  return <SettingsContent />
}
