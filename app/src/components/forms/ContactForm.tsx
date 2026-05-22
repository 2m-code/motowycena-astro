/**
 * ContactForm – Progressive Enhancement.
 *
 * BEZ JS (np. JS zablokowany, jeszcze nie zhydratowany):
 *   Form to czysty HTML POST → /api/contact/ → Cloudflare Function
 *   przekierowuje na /kontakt/?sent=1 (303 PRG pattern). Działa zawsze.
 *
 * Z JS (po hydratacji):
 *   Przejmujemy submit, walidujemy ręcznie (bez zod = mniejszy bundle ~30 kB),
 *   wysyłamy AJAX, pokazujemy inline success/error bez przeładowania.
 *
 * Walidacja serwerowa w functions/api/contact.ts jest niezależna i obowiązkowa.
 */
import { useState, useRef, type ComponentProps } from 'react';
import { Send } from 'lucide-react';

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>;

interface Props {
  turnstileSiteKey?: string;
}

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'message' | 'consent', string>>;
type Status = 'idle' | 'sending' | 'success' | 'error';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(data: Record<string, string>): Errors {
  const errors: Errors = {};
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Podaj imię i nazwisko (min. 2 znaki)';
  }
  if (!data.email || !emailRe.test(data.email.trim())) {
    errors.email = 'Wpisz prawidłowy adres email';
  }
  if (!data.phone || data.phone.trim().length < 9) {
    errors.phone = 'Wpisz numer telefonu (min. 9 cyfr)';
  } else if (data.phone.trim().length > 20) {
    errors.phone = 'Numer zbyt długi';
  }
  if (!data.message || data.message.trim().length < 10) {
    errors.message = 'Wiadomość musi mieć min. 10 znaków';
  } else if (data.message.length > 2000) {
    errors.message = 'Wiadomość zbyt długa (max 2000 znaków)';
  }
  if (data.consent !== 'on' && data.consent !== 'true') {
    errors.consent = 'Wymagana zgoda na przetwarzanie danych';
  }
  return errors;
}

export default function ContactForm({ turnstileSiteKey }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit: FormSubmitHandler = async (e) => {
    // Z JS – przejmujemy submit. Bez JS – handler się nie odpali i form pójdzie zwykłym POST.
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Honeypot – jeśli wypełnione, udawaj sukces (bot myśli że poszło)
    if (data.website) {
      setStatus('success');
      return;
    }

    const fieldErrors = validate(data);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Focus pierwsze pole z błędem (a11y)
      const firstKey = Object.keys(fieldErrors)[0];
      const el = formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`);
      el?.focus();
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...data,
          consent: data.consent === 'on' ? true : data.consent,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('success');
      formRef.current?.reset();
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <h3 className="mb-2 text-lg font-semibold text-emerald-900">Dziękuję za wiadomość!</h3>
        <p className="text-sm text-emerald-800">Odezwę się w ciągu 24h, zazwyczaj dużo szybciej.</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      // Bez JS form ląduje tutaj normalnym POST (progressive enhancement).
      // Trailing slash bo cała strona ma `trailingSlash: 'always'`.
      action="/api/contact/"
      method="POST"
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      {/* Honeypot – niewidoczny dla użytkownika, łapie boty */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Strona internetowa
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="name"
          name="name"
          label="Imię i nazwisko"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          error={errors.name}
        />
        <Field
          id="phone"
          name="phone"
          type="tel"
          label="Telefon"
          autoComplete="tel"
          required
          pattern="[\\d\\s\\+\\-\\(\\)]{9,20}"
          error={errors.phone}
        />
      </div>

      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        error={errors.email}
      />

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-800">
          Wiadomość <span className="text-accent">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={2000}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          placeholder="Opisz krótko czego dotyczy zapytanie (marka/model, rocznik, cel wyceny)..."
        />
        {errors.message && (
          <p id="message-error" className="mt-1 text-xs text-red-700" role="alert">
            {errors.message}
          </p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            aria-invalid={!!errors.consent}
          />
          <span>
            Wyrażam zgodę na przetwarzanie moich danych osobowych w celu odpowiedzi na zapytanie zgodnie z{' '}
            <a href="/polityka-prywatnosci/" className="text-brand-700 underline underline-offset-2">
              polityką prywatności
            </a>
            . <span className="text-red-500">*</span>
          </span>
        </label>
        {errors.consent && (
          <p className="mt-1 text-xs text-red-700" role="alert">
            {errors.consent}
          </p>
        )}
      </div>

      {/* Cloudflare Turnstile – widget renderuje się jeśli script jest załadowany */}
      {turnstileSiteKey && (
        <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" />
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-8 py-3 font-semibold text-white shadow-lg shadow-brand-900/15 transition hover:bg-brand-800 disabled:bg-slate-400 md:w-auto"
      >
        <Send size={17} aria-hidden="true" />
        {status === 'sending' ? 'Wysyłanie…' : 'Wyślij zapytanie'}
      </button>

      {status === 'error' && (
        <p className="text-sm text-red-700" role="alert">
          Coś poszło nie tak. Zadzwoń lub napisz na WhatsApp – ten kanał działa zawsze.
        </p>
      )}
    </form>
  );
}

interface FieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  error?: string;
}

function Field({
  id,
  name,
  label,
  type = 'text',
  autoComplete,
  required,
  minLength,
  maxLength,
  pattern,
  error,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
