import type React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useAutoResizeTextArea } from "@/hooks/useAutoResizeTextArea"

type PlanInputs = {
  bias: string
  orderFlow: string
  criticalMass: string
  currentRange: string
  space: string
  tradeType: string
}

interface PlanInputsProps {
  planInputs: PlanInputs
  handlePlanInputChange: (key: keyof PlanInputs, value: string) => void
  plan: string
  setPlan: React.Dispatch<React.SetStateAction<string>>
}

import "./custom_input.css"

export function PlanInputs({ planInputs, handlePlanInputChange, plan, setPlan }: PlanInputsProps) {
  const textAreaRef = useAutoResizeTextArea(plan)

  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-4 text-sm border-none">
        <div className="grid grid-cols-2 gap-0 sm:grid-cols-6">
          {Object.entries(planInputs).map(([key, value]) => (
            <div key={key} className="flex flex-col items-center">
              <label htmlFor={key} className="font-bold text-xs mb-2 text-center text-gray-700 bg-gray-100 w-full p-2">
                <strong>
                  {key === "orderFlow"
                    ? "Order Flow"
                    : key === "criticalMass"
                      ? "Critical Mass"
                      : key === "currentRange"
                        ? "Current Range"
                        : key === "space"
                          ? "Space"
                          : key === "tradeType"
                            ? "Trade Type"
                            : key.charAt(0).toUpperCase() + key.slice(1)}
                </strong>
              </label>
              <Input
                id={key}
                value={value}
                onChange={(e) => handlePlanInputChange(key as keyof PlanInputs, e.target.value)}
                className="w-full focus:outline-none focus:ring-0 focus:ring-offset-0 input-no-ring rounded-none px-1 py-0.5 bg-transparent border-none text-center text-sm"
              />
            </div>
          ))}
        </div>
        <Textarea
          ref={textAreaRef}
          placeholder="Initial Bias is : "
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full min-h-[250px] mt-2 resize-none border-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
          style={{ overflow: "hidden" }}
        />
      </CardContent>
    </Card>
  )
}

