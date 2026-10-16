import Image from "next/image";

// Header de marca: ícono (H + pulso, recortado del logo real) + wordmark en
// dos tonos, igual que el logo.svg original pero tipografiado en vivo con la
// tipografía de marca (Plus Jakarta Sans) en vez del texto incrustado en el SVG.
export default function BrandHeader() {
  return (
    <header className="brand-bar">
      <Image src="/icons/logo-mark.svg" alt="" width={36} height={36} />
      <span className="font-heading text-lg font-extrabold">
        <span className="text-ink">Historia</span>
        <span className="text-sage-strong">Viva</span>
      </span>
    </header>
  );
}
