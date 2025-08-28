import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { updateTargets } from "@/app/api/targets"

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
    <Card className="border-2 border-red-500">
      <CardHeader className="p-4 bg-red-500 rounded-t-lg">
        <CardTitle className="text-sm text-white">Update Targets</CardTitle>
      </CardHeader>
      <CardContent className="p-4 text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4">
            {[
              { label: "T1", value: t1, setter: setT1 },
              { label: "T2", value: t2, setter: setT2 },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center space-x-2">
                <div className="flex-grow relative">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => handleTargetChange(setter, e.target.value)}
                    className="text-center pr-8 appearance-none no-spinner"
                    min="0"
                    step="10"
                    placeholder={label}
                  />
                  <span className="absolute inset-y-0 left-0 bg-red-100 px-3 flex items-center text-sm text-gray-500">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Button
            className="px-4 py-1 w-60"
            onClick={handleUpdateTargets}
          >
            Update Targets
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}