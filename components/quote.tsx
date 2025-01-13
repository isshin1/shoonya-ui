import React from 'react';

interface QuoteProps {
  quote: string;
  isLoading: boolean;
  onRefresh: () => void;
}

export function Quote({ quote, isLoading, onRefresh }: QuoteProps) {
  return (
    <div 
      className="text-left cursor-pointer p-2"
      onClick={onRefresh}
    >
      <p className="text-sm italic inline-block hover:bg-gray-100 px-2 py-1 rounded transition-colors w-100 h-12 overflow-hidden">
        <span className="line-clamp-2">
          {isLoading ? 'Fetching quote...' : (quote || 'No quote available')}
        </span>
      </p>
    </div>
  );
}
