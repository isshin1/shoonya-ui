import axios from 'axios';

export const endSession = async () => {
  try {
    const response = await axios.post('http://localhost:8090/api/endSession');
    if (response.status === 200) {
      return { success: true, message: "Your trading session has been successfully ended." };
    } else {
      throw new Error('Failed to end session');
    }
  } catch (error: any) {
    console.error('Error ending session:', error);
    throw error;
  }
};

export const addMoney = async (amount: string) => {
  try {
    const response = await axios.post(`http://localhost:8090/api/addFunds/${amount}`);
    if (response.status === 200) {
      return { success: true, message: `Sent request for ₹${amount} to be added via upi` };
    } else {
      throw new Error('Failed to add funds');
    }
  } catch (error: any) {
    console.error('Error adding funds:', error);
    throw error;
  }
};

