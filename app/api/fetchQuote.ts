import axios from 'axios';
import { toast } from "@/components/ui/use-toast"

export const fetchQuote = async (
  setIsLoading: (value: React.SetStateAction<{ [key: string]: boolean }>) => void,
  setQuote: (quote: string) => void
) => {
  setIsLoading(prev => ({ ...prev, quote: true }))
  try {
    console.log("fetching quote");
    const response = await axios.get('http://localhost:8090/api/quote')
    setQuote(response.data.quote)
    console.log(response.data.quote);
  } catch (error) {
    console.error('Error fetching quote:', error)
    toast({
      title: "Error",
      description: "Failed to fetch quote. Please try again.",
      variant: "destructive",
    })
  } finally {
    setIsLoading(prev => ({ ...prev, quote: false }))
  }
};

