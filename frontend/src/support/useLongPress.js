/** Touch hold, desktop context menu, and visible menu buttons share one action surface. */
import { useEffect, useRef } from 'react';
export function useLongPress(onOpen) {
  const timer = useRef(null); const start = useRef(null); const opened = useRef(false);
  const clear = () => { clearTimeout(timer.current); timer.current = null; };
  useEffect(() => clear, []);
  return {
    onPointerDown(e) {
      opened.current = false; if (e.button !== 0 || e.pointerType === 'mouse') return;
      start.current = [e.clientX, e.clientY]; clear();
      timer.current = setTimeout(() => { opened.current = true; onOpen(); }, 550);
    },
    onPointerMove(e) { if (start.current && Math.hypot(e.clientX - start.current[0], e.clientY - start.current[1]) > 10) clear(); },
    onPointerUp: clear, onPointerCancel: clear, onPointerLeave: clear,
    onContextMenu(e) { e.preventDefault(); clear(); opened.current = true; onOpen(); },
    onClickCapture(e) { if (opened.current) { e.preventDefault(); e.stopPropagation(); opened.current = false; } },
  };
}
