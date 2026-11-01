/** Native modal dialog supplies focus trapping and Escape handling for accessible overlays. */
import { useEffect, useRef } from 'react';
export default function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className={`sp-modal ${wide ? 'sp-modal-wide' : ''}`} aria-label={title}
    onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <div className="sp-modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="Close dialog">×</button></div>{children}
  </dialog>;
}
