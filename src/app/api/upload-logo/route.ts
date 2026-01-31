import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const data = await request.formData()
    const file: File | null = data.get('logo') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Type de fichier non supporté. Utilisez PNG, JPG ou SVG' 
      }, { status: 400 })
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Le fichier est trop volumineux (max 5MB)' 
      }, { status: 400 })
    }

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'logos')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const fileName = `logo-${timestamp}.${extension}`
    const filePath = join(uploadsDir, fileName)

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Sauvegarder le chemin dans la base de données
    const logoPath = `/uploads/logos/${fileName}`
    await prisma.parametresEntreprise.upsert({
      where: { userId_key: { userId: user.id, key: 'logoPath' } },
      update: { value: logoPath },
      create: { userId: user.id, key: 'logoPath', value: logoPath },
    })

    return NextResponse.json({ 
      success: true, 
      logoPath,
      message: 'Logo uploadé avec succès' 
    })

  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de l\'upload du logo' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    await prisma.parametresEntreprise.deleteMany({
      where: { userId: user.id, key: 'logoPath' }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Logo supprimé avec succès' 
    })

  } catch (error) {
    console.error('Erreur lors de la suppression du logo:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression du logo' 
    }, { status: 500 })
  }
}
