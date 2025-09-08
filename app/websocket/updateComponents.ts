import type { Dispatch, SetStateAction } from "react"
import type { Position } from '@/types/types'

type AtmData = {
  price: number
  symbol: string
  token: number
  tt: number
}

type FutureData = {
  token: number
  symbol: string
  price?: number  // Add price to futures data
  tt?: number     // Add tt to futures data
}

type UpdateDataProps = {
  setAtmCall: Dispatch<SetStateAction<AtmData>>
  setAtmPut: Dispatch<SetStateAction<AtmData>>
  setAtmFuture?: Dispatch<SetStateAction<FutureData>>
  setOpenOrders: Dispatch<SetStateAction<any[]>>
  setPositions: Dispatch<SetStateAction<Position[]>>
  setTimerLeft: Dispatch<SetStateAction<string | null>>
  setT1Progress?: Dispatch<SetStateAction<number>>
  setT2Progress?: Dispatch<SetStateAction<number>>
  // setT3Progress?: Dispatch<SetStateAction<number>>
}

export function updateData(
  message: any,
  {
    setAtmCall,
    setAtmPut,
    setAtmFuture,
    setOpenOrders,
    setPositions,
    setTimerLeft,
    setT1Progress,
    setT2Progress,
    // setT3Progress,
  }: UpdateDataProps,
) {
  // console.log(`message from websocket ${message}`)
  // console.log(`message type ${message.type}`)
  
  if (message.type === "atm") {
    console.log(`Received ATM update: call token=${message.ceToken}, put token=${message.peToken}`)
    setAtmCall((prevState) => ({
      ...prevState,
      symbol: message.ceTsym,
      token: message.ceToken,
    }))
    setAtmPut((prevState) => ({
      ...prevState,
      symbol: message.peTsym,
      token: message.peToken,
    }))
    console.log("Updated ATM symbols and tokens")
  }

  // Handle future data
  if (message.type === "fut") {
    console.log(`Received Future update: token=${message.token}, symbol=${message.tsym}`)
    if (setAtmFuture) {
      setAtmFuture((prevState) => ({
        ...prevState,
        token: message.token,
        symbol: message.tsym,
        // Include price and tt if available in the message
        ...(message.price && { price: Number(message.price) }),
        ...(message.tt && { tt: message.tt }),
      }))
      console.log("Updated Future symbol and token")
    }
  }

  // Handle price updates for call, put, and futures
  if (message.token && message.price && message.tt) {
    // Convert tokens to strings for comparison to avoid type mismatches
    const messageToken = String(message.token)
    // console.log(messageToken)
    
    // Update call prices
    setAtmCall((prevState) => {
      const prevToken = String(prevState.token)
      if (messageToken === prevToken) {
        return { ...prevState, price: Number(message.price), tt: message.tt }
      }
      return prevState
    })
    
    // Update put prices
    setAtmPut((prevState) => {
      const prevToken = String(prevState.token)
      if (messageToken === prevToken) {
        return { ...prevState, price: Number(message.price), tt: message.tt }
      }
      return prevState
    })
    
    // Update futures prices
    if (setAtmFuture) {
      setAtmFuture((prevState) => {
        const prevToken = String(prevState.token)
        if (messageToken === prevToken) {
          return { 
            ...prevState, 
            price: Number(message.price), 
            tt: message.tt 
          }
        }
        return prevState
      })
    }
  }

  if (message.type === "order") {
    const orders = message.orders
    setOpenOrders(orders || []) // Set to an empty array if orders is null or undefined
    console.log("Updated orders:", orders)
  }

  if (message.type === "position") {
    const positions = message.positions
    if (positions == null || positions.length === 0) {
      console.log("No positions")
    } else {
      setPositions(positions)
    }
  }

  if (message.type === "timer") {
    setTimerLeft(message.left)
  }

  // Handle target progress messages
  if (message.type === "target") {
    const { target, points } = message
    console.log(`Received target update: ${target} with ${points} points`)
    if (target === "t1" && setT1Progress) {
      setT1Progress(points)
    } else if (target === "t2" && setT2Progress) {
      setT2Progress(points)
    }
  }
}