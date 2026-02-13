import React, { useState, useRef, useEffect } from "react";
import { Box, measureElement, useInput, useStdout, type DOMElement } from "ink";

interface ScrollViewProps {
  children: React.ReactNode;
}

// TabBar (1 content + 1 border) + StatusBar (1 border + 1 content)
const CHROME_HEIGHT = 4;

export function ScrollView({ children }: ScrollViewProps) {
  const { stdout } = useStdout();
  const innerRef = useRef<DOMElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const terminalRows = stdout.rows ?? 24;
  const viewportHeight = Math.max(1, terminalRows - CHROME_HEIGHT);
  const maxOffset = Math.max(0, contentHeight - viewportHeight);
  const canScroll = contentHeight > viewportHeight;

  useEffect(() => {
    if (innerRef.current) {
      const { height } = measureElement(innerRef.current);
      setContentHeight(height);
    }
  });

  // Clamp scroll offset when content or viewport changes
  useEffect(() => {
    if (scrollOffset > maxOffset) {
      setScrollOffset(maxOffset);
    }
  }, [maxOffset, scrollOffset]);

  useInput((input: string, key: { upArrow: boolean; downArrow: boolean }) => {
    if (!canScroll) return;

    if (key.upArrow || input === "k") {
      setScrollOffset((o: number) => Math.max(0, o - 1));
    }
    if (key.downArrow || input === "j") {
      setScrollOffset((o: number) => Math.min(maxOffset, o + 1));
    }
  });

  return (
    <Box height={viewportHeight} overflowY="hidden">
      <Box ref={innerRef} flexDirection="column" marginTop={-scrollOffset}>
        {children}
      </Box>
    </Box>
  );
}
