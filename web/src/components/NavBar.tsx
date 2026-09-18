"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/pacientes", etiqueta: "Pacientes" },
  { href: "/registro", etiqueta: "Registrar" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="nav-bar flex-wrap">
      <Link href="/" className="flex items-center gap-2 font-extrabold text-purple-1">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-purple-1 bg-green-1" aria-hidden />
        HistoriaViva
      </Link>
      <nav className="flex items-center gap-1">
        {ENLACES.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`nav-link ${pathname === enlace.href ? "nav-link-active" : ""}`}
          >
            {enlace.etiqueta}
          </Link>
        ))}
      </nav>
    </header>
  );
}
