import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  // Here you would typically fetch data from your database or external API
  // For this example, we'll generate some random data
  const generateRandomPnL = () => Math.floor(Math.random() * 2000) - 1000

  const pnlData: { [key: string]: number } = {}
  let currentDate = new Date(start as string)
  const endDate = new Date(end as string)

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0]
    pnlData[dateString] = generateRandomPnL()
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return NextResponse.json(pnlData)
}

