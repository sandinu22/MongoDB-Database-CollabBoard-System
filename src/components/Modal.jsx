import React, { useEffect } from "react";

function Modal({ title, eyebrow, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal-card ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>{eyebrow && <span className="section-kicker">{eyebrow}</span>}<h2>{title}</h2></div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default Modal;
