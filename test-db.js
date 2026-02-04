
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
    try {
        const sales = await prisma.sale.findMany({
            select: {
                invoiceNo: true,
                items: true,
                serviceName: true
            }
        })
        console.log(`Found ${sales.length} sales:`)
        sales.forEach(s => {
            console.log(`- ${s.invoiceNo}: items='${s.items}' (type: ${typeof s.items})`)
            if (s.items && typeof s.items === 'string') {
                try {
                    JSON.parse(s.items)
                    console.log(`  ✅ JSON OK`)
                } catch (e) {
                    console.log(`  ❌ INVALID JSON: ${e.message}`)
                }
            }
        })
    } catch (e) {
        console.error('DB Error:', e)
    } finally {
        await prisma.$disconnect()
    }
}

test()
