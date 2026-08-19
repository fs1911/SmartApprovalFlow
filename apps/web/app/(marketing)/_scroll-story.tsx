'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-driven storytelling of the Klarwerk customer journey (Block 47).
 *
 * A phone mockup stays pinned (sticky) while the four narrative steps scroll
 * past; the phone swaps its screen as each step becomes active. Built on a
 * plain IntersectionObserver so it degrades gracefully: without JS every step
 * is visible and the phone shows the final state; `prefers-reduced-motion`
 * users get the same content without the cross-fades.
 */

interface Step {
  n: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Die Werkstatt sendet die Freigabe',
    body: 'Zusatzarbeiten mit Foto, Klartext und Preisband – als sicherer Link, in Minuten erstellt statt am Telefon durchbuchstabiert.',
  },
  {
    n: '02',
    title: 'Die Kundschaft öffnet den Link',
    body: 'Mobil, ohne App und ohne Login. Jede empfohlene Position ist verständlich erklärt, mit transparenter Preisspanne.',
  },
  {
    n: '03',
    title: 'Entscheidung mit einem Tipp',
    body: 'Freigeben, ablehnen oder Rückruf wünschen – einzeln oder gesamt. Die Werkstatt sieht die Antwort sofort.',
  },
  {
    n: '04',
    title: 'Alles sauber dokumentiert',
    body: 'Wer was wann freigegeben hat, ist revisionssicher festgehalten. Keine Diskussionen mehr bei der Rechnung.',
  },
];

/** The phone screen for a given step (0–3). */
function PhoneScreen({ step }: { step: number }) {
  return (
    <div className="mk-device__screen">
      <div className="mk-device__bar">
        <div className="mk-device__brand">Klarwerk</div>
        <div className="mk-device__title">Muster-Garage · AC-2026-0142</div>
      </div>

      {step === 0 && (
        <div className="mk-device__body mk-screen-fade">
          <div className="mk-notif">
            <div className="mk-notif__icon" aria-hidden>
              🔔
            </div>
            <div>
              <div className="mk-line__label">Neue Freigabe erhalten</div>
              <div className="mk-line__hint">Muster-Garage möchte Zusatzarbeiten klären</div>
            </div>
          </div>
          <div className="mk-notif__cta">Freigabe öffnen →</div>
          <div className="mk-device__foot">Sicherer Link · ohne App, ohne Login</div>
        </div>
      )}

      {step === 1 && (
        <div className="mk-device__body mk-screen-fade">
          <div className="mk-line">
            <span>
              <span className="mk-line__label">Bremsbeläge vorne ersetzen</span>
              <br />
              <span className="mk-line__hint">Sicherheit · empfohlen</span>
            </span>
            <span className="mk-line__price">180–220.–</span>
          </div>
          <div className="mk-line">
            <span>
              <span className="mk-line__label">Ölservice inkl. Filter</span>
              <br />
              <span className="mk-line__hint">Wartung</span>
            </span>
            <span className="mk-line__price">140–160.–</span>
          </div>
          <div className="mk-line">
            <span>
              <span className="mk-line__label">Zündkerzen (4×)</span>
              <br />
              <span className="mk-line__hint">Wartung</span>
            </span>
            <span className="mk-line__price">95–120.–</span>
          </div>
          <div className="mk-device__total">
            <span>Geschätzt gesamt</span>
            <span>415–500.–</span>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mk-device__body mk-screen-fade">
          <div className="mk-device__total">
            <span>Geschätzt gesamt</span>
            <span>415–500.–</span>
          </div>
          <div className="mk-device__actions">
            <span className="mk-btn-approve mk-btn-approve--pressed">✓ Freigeben</span>
            <span className="mk-btn-decline">Ablehnen</span>
          </div>
          <div className="mk-tap" aria-hidden>
            <span className="mk-tap__ring" />
          </div>
          <div className="mk-device__foot">Ein Tipp genügt – einzeln oder gesamt</div>
        </div>
      )}

      {step === 3 && (
        <div className="mk-device__body mk-screen-fade">
          <div className="mk-receipt">
            <div className="mk-receipt__check" aria-hidden>
              ✓
            </div>
            <div className="mk-line__label">Freigegeben</div>
            <div className="mk-line__hint">am 18. Aug. 2026, 14:05 · belegbar</div>
          </div>
          <div className="mk-line">
            <span className="mk-line__label">Status</span>
            <span className="mk-badge-approved">Freigegeben</span>
          </div>
          <div className="mk-line">
            <span className="mk-line__label">Werkstatt benachrichtigt</span>
            <span className="mk-line__hint">sofort</span>
          </div>
          <div className="mk-device__foot">Revisionssicher dokumentiert</div>
        </div>
      )}
    </div>
  );
}

export function ScrollStory() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const els = stepRefs.current.filter(Boolean) as HTMLLIElement[];
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            setActive(idx);
          }
        }
      },
      // A narrow band across the vertical middle: the step in the centre wins.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="mk-story" aria-label="So funktioniert Klarwerk">
      <div className="mk-container mk-story__head">
        <span className="mk-eyebrow">So funktioniert es</span>
        <h2>Von der Empfehlung zur dokumentierten Freigabe.</h2>
      </div>
      <div className="mk-container mk-story__grid">
        {/* Pinned phone */}
        <div className="mk-story__media">
          <div className="mk-device" role="img" aria-label="Smartphone-Ansicht der Kunden-Freigabe">
            <PhoneScreen step={active} />
          </div>
        </div>

        {/* Scrolling steps */}
        <ol className="mk-story__steps">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              data-idx={i}
              data-active={active === i}
              className="mk-story__step"
            >
              <div className="mk-story__n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
