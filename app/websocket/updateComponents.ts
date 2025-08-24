import type { Dispatch, SetStateAction } from "react"
import type { Position } from '@/types/types'

type AtmData = {
  price: number
  symbol: string
  token: number
  tt: number
}



type UpdateDataProps = {
  setAtmCall: Dispatch<SetStateAction<AtmData>>
  setAtmPut: Dispatch<SetStateAction<AtmData>>
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
    setOpenOrders,
    setPositions,
    setTimerLeft,
    setT1Progress,
    setT2Progress,
    // setT3Progress,
  }: UpdateDataProps,
) {
  console.log(`message from websocket ${message}`)
  console.log(`message type ${message.type}`)
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

  if (message.token && message.price && message.tt) {
    // Convert tokens to strings for comparison to avoid type mismatches
    const messageToken = String(message.token)

    setAtmCall((prevState) => {
      const prevToken = String(prevState.token)

      if (messageToken === prevToken) {
        return { ...prevState, price: Number(message.price), tt: message.tt }
      }
      return prevState
    })

    setAtmPut((prevState) => {
      const prevToken = String(prevState.token)

      if (messageToken === prevToken) {
        return { ...prevState, price: Number(message.price), tt: message.tt }
      }
      return prevState
    })
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

