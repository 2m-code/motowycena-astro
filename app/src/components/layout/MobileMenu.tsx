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
import { Menu, X, Phone, MessageCircle } from 'lucide-react';

interface ServiceLink {
  slug: string;
  name: string;
}

interface Props {
  services: ReadonlyArray<ServiceLink>;
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
}

export default function MobileMenu({ services, phone, phoneDisplay, whatsapp }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const whatsappUrl = `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="-mr-2 rounded-xl p-2 text-slate-900 transition hover:bg-slate-100 hover:text-brand-700 lg:hidden"
        aria-label="Otwórz menu"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Menu size={24} aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu nawigacji"
            className="fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <span className="font-bold text-lg text-brand-700">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-2 rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label="Zamknij menu"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Menu główne mobilne">
              <ul className="space-y-1">
                <li>
                  <a
                    ref={firstLinkRef}
                    href="/"
                    className="block rounded-xl px-3 py-3 text-base font-medium text-slate-800 hover:bg-brand-50"
                  >
                    Strona główna
                  </a>
                </li>
                <li className="pt-3">
                  <p className="mb-1 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Usługi
                  </p>
                  <ul className="space-y-0.5">
                    {services.map((s) => (
                      <li key={s.slug}>
                        <a
                          href={`/${s.slug}/`}
                          className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-brand-50"
                        >
                          {s.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="mt-3 border-t border-slate-200 pt-3">
                  <a
                    href="/realizacje/"
                    className="block rounded-xl px-3 py-3 text-base font-medium text-slate-800 hover:bg-brand-50"
                  >
                    Realizacje
                  </a>
                </li>
                <li>
                  <a
                    href="/kontakt/"
                    className="block rounded-xl px-3 py-3 text-base font-medium text-slate-800 hover:bg-brand-50"
                  >
                    Kontakt
                  </a>
                </li>
              </ul>
            </nav>

            <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-4">
              <a
                href={`tel:${phone}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white transition hover:bg-brand-800"
              >
                <Phone size={18} aria-hidden="true" />
                {phoneDisplay}
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700"
              >
                <MessageCircle size={18} aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}
