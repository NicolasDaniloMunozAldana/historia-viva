"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    etiqueta: "Inicio",
    icono: (
      <path
        d="M4 11.5 12 5l8 6.5M6 10v8.5a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/pacientes",
    etiqueta: "Pacientes",
    icono: (
      <>
        <circle cx="9" cy="8.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M3.5 19c.7-3 2.9-5 5.5-5s4.8 2 5.5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M15.5 6.3c1.3.4 2.2 1.6 2.2 2.9 0 1.4-1 2.6-2.3 2.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 14.2c2 .5 3.5 2.2 4 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar">
      {TABS.map((tab) => {
        const activo = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} className={`tab-item ${activo ? "tab-item-active" : ""}`}>
            <svg width="24" height="24" viewBox="0 0 22 22">
              {tab.icono}
            </svg>
            {tab.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
