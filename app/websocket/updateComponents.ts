import { Dispatch, SetStateAction } from 'react'

type AtmData = {
  price: number
  symbol: string
  token: number
  tt: number
}

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
}

type UpdateDataProps = {
  setAtmCall: Dispatch<SetStateAction<AtmData>>
  setAtmPut: Dispatch<SetStateAction<AtmData>>
  setOpenOrders: Dispatch<SetStateAction<any[]>>
  setPositions: Dispatch<SetStateAction<Position[]>>
  setTimerLeft: Dispatch<SetStateAction<string | null>>
}

export function updateData(message: any, { setAtmCall, setAtmPut, setOpenOrders, setPositions, setTimerLeft }: UpdateDataProps) {
  if (message.type === 'atm') {
    console.log(message);
    setAtmCall(prevState => ({
      ...prevState,
      symbol: message.ceTsym,
      token: message.ceToken,
    }));
    
    setAtmPut(prevState => ({
      ...prevState,
      symbol: message.peTsym,
      token: message.peToken,
    }));

    console.log("Changed latest symbols");
  }

  if (message.token && message.price && message.tt) {
    setAtmCall(prevState => {
      if (message.token === prevState.token) {
        return { ...prevState, price: message.price, tt: message.tt };
      }
      return prevState;
    });
    
    setAtmPut(prevState => {
      if (message.token === prevState.token) {
        return { ...prevState, price: message.price, tt: message.tt };
      }
      return prevState;
    });
  }

  if (message.type === 'order') {
    const orders = message.orders;
    setOpenOrders(orders || []); // Set to an empty array if orders is null or undefined
    console.log("Updated orders:", orders);
  }

  if (message.type === 'position') {
    const positions = message.positions;
    if (positions == null || positions.length === 0) {
      console.log("No positions");
    } else {
      setPositions(positions);
    }
  }

  if (message.type === 'timer') {
    setTimerLeft(message.left);
  }
}

