import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Seed minimal : crée uniquement les paramètres entreprise par défaut.
 * Aucune donnée de démonstration (clients, articles, ventes, charges).
 * Lie les paramètres au premier utilisateur existant, ou crée un utilisateur de seed si aucun.
 */
async function main() {
  let user = await prisma.user.findFirst()
  if (!user) {
    console.log('👤 Aucun utilisateur trouvé, création d’un utilisateur de seed...')
    const hashedPassword = await bcrypt.hash('seed-password', 12)
    user = await prisma.user.create({
      data: {
        email: 'seed@example.com',
        password: hashedPassword,
        firstName: 'Seed',
        lastName: 'User',
      },
    })
    console.log('✅ Utilisateur seed créé (email: seed@example.com).')
  }

  const count = await prisma.parametresEntreprise.count({ where: { userId: user.id } })
  if (count > 0) {
    console.log('⏭️  Paramètres déjà présents pour cet utilisateur, rien à faire.')
    return
  }

  console.log('🏢 Création des paramètres entreprise par défaut...')
  const defaults = [
    { key: 'companyName', value: 'Mon entreprise' },
    { key: 'companyAddress', value: '' },
    { key: 'companyPhone', value: '' },
    { key: 'defaultTvaRate', value: '20' },
    { key: 'tauxUrssaf', value: '22' },
  ]

  for (const { key, value } of defaults) {
    await prisma.parametresEntreprise.create({
      data: { key, value, userId: user.id },
    })
  }

  console.log('✅ Paramètres créés.')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
