import React from 'react';

interface PanelFrameProps {
  /** Usually a <HudBar>; rendered sticky at the top of the frame. */
  header?: React.ReactNode;
  /** Optional strip rendered directly under the header (also sticky). */
  subheader?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;
  bodyRef?: React.Ref<HTMLDivElement>;
  /** Extra absolutely-positioned children (e.g. a resize grip). */
  overlay?: React.ReactNode;
}

/**
 * PanelFrame — container for a pane or sheet (brief §4.1).
 * Anatomy: 1px border · sticky header strip · scrolling body · optional footer.
 * Skins may restyle the frame (border, corners, texture); the structure is fixed.
 */
export function PanelFrame({
  header,
  subheader,
  footer,
  children,
  className = '',
  style,
  bodyClassName = '',
  bodyStyle,
  bodyRef,
  overlay,
}: PanelFrameProps) {
  return (
    <section className={`panel-frame ${className}`.trim()} style={style}>
      {(header || subheader) && (
        <div className="panel-frame__head">
          {header}
          {subheader}
        </div>
      )}
      <div ref={bodyRef} className={`panel-frame__body ${bodyClassName}`.trim()} style={bodyStyle}>
        {children}
      </div>
      {footer && <div className="panel-frame__foot">{footer}</div>}
      {overlay}
    </section>
  );
}
