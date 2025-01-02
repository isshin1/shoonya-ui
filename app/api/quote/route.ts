import { NextResponse } from 'next/server'

const quotes = [
  "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
  "In investing, what is comfortable is rarely profitable.",
  "The four most dangerous words in investing are: 'This time it's different.'",
  "The stock market is a device for transferring money from the impatient to the patient.",
  "Risk comes from not knowing what you're doing.",
]

export async function GET() {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
  return NextResponse.json({ quote: randomQuote })
}

