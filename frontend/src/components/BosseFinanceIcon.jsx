import React from 'react';

// Iconografía vectorial propia de la interfaz. No requiere paquetes externos ni fuentes.
const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export default function BosseFinanceIcon({ name = 'layers', size = 20, className = '' }) {
  const strokes = {
    coins: <><ellipse cx="9" cy="5" rx="6" ry="2.4"/><path d="M3 5v4c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V5M3 9v4c0 1.3 2.7 2.4 6 2.4 1.5 0 3-.2 4-1"/><ellipse cx="17" cy="15" rx="4" ry="2"/><path d="M13 15v4c0 1.1 1.8 2 4 2s4-.9 4-2v-4"/></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M6 6V4a2 2 0 0 1 2-2h11"/><circle cx="17" cy="15" r="1"/></>,
    chart: <><path d="M4 20V4M4 20h17"/><rect x="7" y="12" width="3" height="6" rx=".5"/><rect x="12" y="8" width="3" height="10" rx=".5"/><rect x="17" y="4" width="3" height="14" rx=".5"/></>,
    trend: <><path d="m3 17 7-7 4 4 7-8M15 6h6v6"/></>,
    percent: <><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><path d="M19 5 5 19"/></>,
    people: <><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><circle cx="18" cy="8" r="2.5"/><path d="M17 14a5 5 0 0 1 4 5v1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M8 14h3M14 14h3M8 18h3"/></>,
    exchange: <><path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    sparkles: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2ZM19 2l.6 1.4L21 4l-1.4.6L19 6l-.6-1.4L17 4l1.4-.6L19 2Z"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></>,
    eye: <><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    pdf: <><path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M15 2v5h5M8 13h8M8 17h6"/></>,
    excel: <><path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M15 2v5h5M9 12l6 6m0-6-6 6"/></>,
    home: <><path d="m3 11 9-8 9 8v10H3V11Z"/><path d="M9 21v-7h6v7"/></>,
    building: <><path d="M3 21V7l9-4 9 4v14H3Z"/><path d="M3 10h18M7 14h2M12 14h2M17 14h2M7 18h2M12 18h2M17 18h2"/></>,
    chevronRight: <path d="m9 5 7 7-7 7"/>,
    chevronDown: <path d="m5 9 7 7 7-7"/>,
    back: <><path d="m10 5-7 7 7 7M3 12h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
    file: <><path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M15 2v5h5M8 12h8M8 16h8"/></>,
    filter: <><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></>,
    check: <path d="m4 13 5 5L20 6"/>,
    sliders: <><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="9" cy="6" r="2" fill="var(--be-card,#fff)"/><circle cx="16" cy="12" r="2" fill="var(--be-card,#fff)"/><circle cx="8" cy="18" r="2" fill="var(--be-card,#fff)"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/></>,
    shield: <><path d="M12 2 21 6v6c0 5.2-3.5 8.1-9 10-5.5-1.9-9-4.8-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/></>,
    download: <><path d="M12 3v13m-5-5 5 5 5-5M4 19v3h16v-3"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7m10 10 2.1 2.1m0-14.2L17 7M7 17l-2.1 2.1"/></>,
    book: <><path d="M4 4h7a4 4 0 0 1 4 4v13a4 4 0 0 0-4-2H4V4ZM20 4h-5a4 4 0 0 0-4 4"/></>,
    logout: <><path d="M10 4H5v16h5M13 8l4 4-4 4M8 12h9"/></>
  };
  return <svg className={`bosse-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}>
    {strokes[name] || strokes.layers}
  </svg>;
}
