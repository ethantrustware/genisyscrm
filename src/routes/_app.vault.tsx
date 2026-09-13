import { createFileRoute } from '@tanstack/react-router'
import Vault from '@/pages/Vault'

export const Route = createFileRoute('/_app/vault')({
  component: Vault,
})
