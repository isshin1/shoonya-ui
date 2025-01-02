import { useEffect, useRef } from 'react';

export function useAutoResizeTextArea(value: string) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (textArea) {
      // We need to reset the height momentarily to get the correct scrollHeight for the textarea
      textArea.style.height = "0px";
      const scrollHeight = textArea.scrollHeight;

      // We then set the height directly, outside of the render loop
      // Trying to set this with state or a ref will product an incorrect value.
      textArea.style.height = scrollHeight + "px";
    }
  }, [value]);

  return textAreaRef;
}

