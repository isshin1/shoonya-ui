import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { updateTargets } from "@/app/api/targets"
import { Target, Plus, Trash2, Edit3 } from 'lucide-react';
import { Label } from '@/components/ui/label';


export const UpdateTargets: React.FC = () => {
  const [t1, setT1] = useState(20)
  const [t2, setT2] = useState(0)
  const { toast } = useToast()

  const handleTargetChange = (setter: React.Dispatch<React.SetStateAction<number>>, value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue >= 0) {
      setter(numValue)
    }
  }

  const handleUpdateTargets = async () => {
    try {
      const result = await updateTargets(t1, t2)
      toast({
        title: "Targets Updated",
        description: "Target values have been successfully updated",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update targets. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="p-0 ">
      <CardHeader >
        <CardTitle className="flex items-center space-x-2 text-sm">
            <Target className="h-5 w-5" />
            <span>Update Targets</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="t1">Target 1 (T1)</Label>
              <Input
                id="t1"
                type="number"
                value={t1}
                onChange={(e) => setT1(Number(e.target.value))}
                placeholder="T1"
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t2">Target 2 (T2)</Label>
              <Input
                id="t2"
                type="number"
                value={t2}
                onChange={(e) => setT2(Number(e.target.value))}
                placeholder="T2"
                className="bg-gray-100"
              />
            </div>
          </div>

          <Button
            className="w-full flex items-center justify-center gap-0 px-3 py-0 text-sm font-medium text-black bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleUpdateTargets}
          >
            Update Targets
          </Button>


      </CardContent>
    </Card>
  )
}