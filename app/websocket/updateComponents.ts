import { Dispatch, SetStateAction } from 'react'

type AtmData = {
  price: number
  symbol: string
  token: number
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
}

export function updateData(message: any, { setAtmCall, setAtmPut, setOpenOrders, setPositions }: UpdateDataProps) {
  if (message.type === 'atm') {
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

  if (message.type === 'price') {
    setAtmCall(prevState => {
      if (message.token === prevState.token) {
        return { ...prevState, price: message.price };
      }
      return prevState;
    });
    
    setAtmPut(prevState => {
      if (message.token === prevState.token) {
        return { ...prevState, price: message.price };
      }
      return prevState;
    });
  }

  if (message.type === 'order') {
    // console.log("Order update received");
    const orders = message.orders;
    if (orders.length === 0) {
    //   console.log("No orders");
    } else {
      setOpenOrders(orders);
    }
  }

  if (message.type === 'position') {
    // console.log("Position update received");
    const positions = message.positions;
    if (positions == null || positions.length === 0) {
    //   console.log("No positions");
    } else {
      setPositions(positions);
    }
  }
}

