import { useState, useRef } from 'react';

function reorder(arr, from, to) {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/**
 * Drag-and-drop sort hook using Pointer Events (works on both mouse and touch).
 *
 * Usage:
 *   const { containerRef, displayItems, origIndices, isDragging,
 *           getItemStyle, onHandlePointerDown } = useDragSort(items, onReorder);
 *
 * - Attach containerRef to the wrapper div that contains ONLY the sortable items.
 * - Render displayItems (instead of items) in the loop.
 * - origIndices[displayIdx] gives the original index of the item at that display position.
 * - Apply getItemStyle(displayIdx) to each item's wrapper div.
 * - Attach onPointerDown={e => onHandlePointerDown(e, displayIdx)} to the drag handle element.
 * - Set style={{ touchAction: 'none' }} on the handle to prevent scroll conflicts.
 */
export function useDragSort(items, onReorder) {
  const [drag, setDrag] = useState(null); // { fromIdx, overIdx }
  const containerRef = useRef(null);
  // Keep a ref to items so event handlers always see the latest value
  const itemsRef = useRef(items);
  itemsRef.current = items;

  function findOverIndex(clientY) {
    if (!containerRef.current) return 0;
    const els = Array.from(containerRef.current.children);
    let best = 0;
    let bestDist = Infinity;
    els.forEach((el, i) => {
      const { top, height } = el.getBoundingClientRect();
      const dist = Math.abs(clientY - (top + height / 2));
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  }

  function onHandlePointerDown(e, displayIdx) {
    e.preventDefault();
    const pid = e.pointerId;
    setDrag({ fromIdx: displayIdx, overIdx: displayIdx });

    const onMove = ev => {
      if (ev.pointerId !== pid) return;
      const over = findOverIndex(ev.clientY);
      setDrag(d => d ? { ...d, overIdx: over } : null);
    };

    const onUp = ev => {
      if (ev.pointerId !== pid) return;
      setDrag(d => {
        if (d && d.fromIdx !== d.overIdx) {
          onReorder(reorder(itemsRef.current, d.fromIdx, d.overIdx));
        }
        return null;
      });
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  const displayItems = drag ? reorder(items, drag.fromIdx, drag.overIdx) : items;
  const origIndices = drag
    ? reorder(items.map((_, i) => i), drag.fromIdx, drag.overIdx)
    : items.map((_, i) => i);

  function getItemStyle(displayIdx) {
    if (!drag || displayIdx !== drag.overIdx) return {};
    return {
      opacity: 0.65,
      transform: 'scale(1.015)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      position: 'relative',
      zIndex: 20,
    };
  }

  return {
    containerRef,
    displayItems,
    origIndices,
    isDragging: !!drag,
    getItemStyle,
    onHandlePointerDown,
  };
}
