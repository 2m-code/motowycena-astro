/**
 * Mobile menu - React island hydrowany client:idle.
 *
 * Renderuje:
 *   - przycisk hamburger (sterowany prop `expanded` po stronie React)
 *   - panel drawer wysuwany z prawej, z trapping focusa i Esc do zamknięcia
 *
 * UWAGA: Header.astro renderuje SSR przycisk hamburger jako fallback no-JS
 * (linkuje do #menu - można scrollować do footera). Ten React island PRZEJMUJE
 * sterowanie po hydratacji, podmieniając statyczny button na interaktywny.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';

interface ServiceLink {
  slug: string;
  name: string;
}

interface Props {
  services: ReadonlyArray<ServiceLink>;
}

const mainLinks = [
  { href: '/pomoc-prawna/', label: 'Pomoc prawna' },
  { href: '/realizacje/', label: 'Realizacje' },
  { href: '/biegly-sadowy/', label: 'Biegły sądowy' },
  { href: '/biegly-skarbowy/', label: 'Biegły skarbowy' },
  { href: '/rzeczoznawca-ostrow-wielkopolski/', label: 'Ostrów Wielkopolski' },
  { href: '/kontakt/', label: 'Kontakt' },
];

export default function MobileMenu({ services }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Blokada scrolla pod drawerem + Escape do zamknięcia
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    // Focus pierwszego linku po otwarciu (a11y)
    firstLinkRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="-mr-2 rounded-xl p-2.5 text-slate-900 transition hover:bg-slate-100 hover:text-brand-700 lg:hidden"
        aria-label="Otwórz menu"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Menu size={24} aria-hidden="true" />
      </button>

      {mounted && open && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu nawigacji"
            className="fixed bottom-0 right-0 top-0 z-[80] flex h-dvh max-h-dvh w-[92vw] max-w-sm flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <span className="font-bold text-lg text-brand-700">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-2 rounded-xl p-2.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label="Zamknij menu"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4" aria-label="Menu główne mobilne">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                    Sekcje
                  </p>
                  <ul className="space-y-1">
                    {mainLinks.map((link, index) => (
                      <li key={link.href}>
                        <a
                          ref={index === 0 ? firstLinkRef : undefined}
                          href={link.href}
                          className="block rounded-xl px-4 py-3 text-base font-bold text-slate-900 hover:bg-brand-50 hover:text-brand-800"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                    Usługi
                  </p>
                  <ul className="space-y-1">
                    {services.map((s) => (
                      <li key={s.slug}>
                        <a
                          href={`/${s.slug}/`}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-brand-50 hover:text-brand-800"
                        >
                          {s.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </nav>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
