type Position = {
  id: string
  tsym: string
  type: 'call' | 'put'
  daybuyavgprc: string
  totsellavgprc: string
  currentPrice: string
  exitPrice: string
  daybuyqty: string
  netqty: string
  status: 'active' | 'closed'
  [key: string]: any  // Add this line to allow additional properties
}

export type {Position}