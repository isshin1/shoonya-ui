import React from "react";

type TradeMode = "no-trade" | "call" | "put";

interface TradeModeProps {
  tradeMode: TradeMode;
  onTradeModeChange: (mode: TradeMode) => void;
}

export const TradeModeSelector: React.FC<TradeModeProps> = ({
  tradeMode,
  onTradeModeChange,
}) => {
  return (
    <div className="ml-4">
      <div className="bg-gray-100 p-0.5 rounded-md flex h-8">
        <button
          className={`px-3 rounded-md text-xs font-medium transition-colors ${
            tradeMode === "no-trade"
              ? "bg-gray-900 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => onTradeModeChange("no-trade")}
        >
          No Trade
        </button>
        <button
          className={`px-3 rounded-md text-xs font-medium transition-colors ${
            tradeMode === "call"
              ? "bg-green-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => onTradeModeChange("call")}
        >
          Call
        </button>
        <button
          className={`px-3 rounded-md text-xs font-medium transition-colors ${
            tradeMode === "put"
              ? "bg-red-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => onTradeModeChange("put")}
        >
          Put
        </button>
      </div>
    </div>
  );
};