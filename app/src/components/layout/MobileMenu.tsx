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
        className="lg:hidden p-2 -mr-2 text-gray-900 hover:text-brand-700 transition"
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
            className="fixed inset-y-0 right-0 z-50 w-[88%] max-w-sm bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="font-bold text-lg text-brand-700">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 text-gray-700 hover:text-gray-900 transition"
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
                    className="block px-3 py-3 text-base font-medium hover:bg-gray-50 rounded-lg"
                  >
                    Strona główna
                  </a>
                </li>
                <li className="pt-3">
                  <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Usługi
                  </p>
                  <ul className="space-y-0.5">
                    {services.map((s) => (
                      <li key={s.slug}>
                        <a
                          href={`/${s.slug}/`}
                          className="block px-3 py-2.5 text-sm hover:bg-gray-50 rounded-lg"
                        >
                          {s.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="pt-3 border-t border-gray-200 mt-3">
                  <a
                    href="/realizacje/"
                    className="block px-3 py-3 text-base font-medium hover:bg-gray-50 rounded-lg"
                  >
                    Realizacje
                  </a>
                </li>
                <li>
                  <a
                    href="/kontakt/"
                    className="block px-3 py-3 text-base font-medium hover:bg-gray-50 rounded-lg"
                  >
                    Kontakt
                  </a>
                </li>
              </ul>
            </nav>

            <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
              <a
                href={`tel:${phone}`}
                className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-3 rounded-lg transition"
              >
                <Phone size={18} aria-hidden="true" />
                {phoneDisplay}
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-3 rounded-lg transition"
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
