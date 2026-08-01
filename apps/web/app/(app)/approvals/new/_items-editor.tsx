'use client';

import { ITEM_CATEGORY, ITEM_CATEGORY_LABELS, type ItemCategory } from '@saf/types';

export interface ItemRow {
  title: string;
  category: ItemCategory;
  description: string;
  priceMin: string;
  priceMax: string;
}

export const emptyItem = (): ItemRow => ({
  title: '',
  category: 'REPAIR',
  description: '',
  priceMin: '',
  priceMax: '',
});

/**
 * Dynamic list of recommended positions (Block 22). Controlled by the parent so
 * the voice draft can replace the rows and the user can add/remove/edit them.
 * Each input carries an `items[i].*` name so the server action reads them back.
 */
export function ItemsEditor({
  items,
  setItems,
  errors,
}: {
  items: ItemRow[];
  setItems: (rows: ItemRow[]) => void;
  errors?: Record<string, string>;
}) {
  function update(i: number, patch: Partial<ItemRow>) {
    setItems(items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function add() {
    setItems([...items, emptyItem()]);
  }
  function remove(i: number) {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next.length > 0 ? next : [emptyItem()]);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card__body">
        <h2>Empfohlene Arbeiten</h2>
        <p className="hint" style={{ marginTop: -4 }}>
          Eine Position pro Arbeit. Der Kunde kann später einzeln entscheiden.
        </p>

        {items.map((row, i) => (
          <div
            key={i}
            style={{
              borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
              paddingTop: i > 0 ? 16 : 0,
              marginTop: i > 0 ? 8 : 0,
            }}
          >
            <div className="field">
              <label htmlFor={`item-${i}-title`}>
                Position {i + 1} {i === 0 && <span className="required-mark">*</span>}
              </label>
              <input
                id={`item-${i}-title`}
                name={`items[${i}].title`}
                value={row.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="z. B. Bremsbeläge hinten ersetzen"
                required={i === 0}
              />
              {errors?.[`items.${i}.title`] && (
                <span className="error">{errors[`items.${i}.title`]}</span>
              )}
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor={`item-${i}-category`}>Kategorie</label>
                <select
                  id={`item-${i}-category`}
                  name={`items[${i}].category`}
                  value={row.category}
                  onChange={(e) => update(i, { category: e.target.value as ItemCategory })}
                >
                  {ITEM_CATEGORY.map((cat) => (
                    <option key={cat} value={cat}>
                      {ITEM_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`item-${i}-desc`}>Beschreibung (optional)</label>
                <input
                  id={`item-${i}-desc`}
                  name={`items[${i}].description`}
                  value={row.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Kurzer Zusatz für den Kunden"
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor={`item-${i}-min`}>Preis von (CHF)</label>
                <input
                  id={`item-${i}-min`}
                  name={`items[${i}].priceMin`}
                  inputMode="decimal"
                  value={row.priceMin}
                  onChange={(e) => update(i, { priceMin: e.target.value })}
                  placeholder="180.00"
                />
              </div>
              <div className="field">
                <label htmlFor={`item-${i}-max`}>Preis bis (CHF)</label>
                <input
                  id={`item-${i}-max`}
                  name={`items[${i}].priceMax`}
                  inputMode="decimal"
                  value={row.priceMax}
                  onChange={(e) => update(i, { priceMax: e.target.value })}
                  placeholder="240.00"
                />
              </div>
            </div>
            {items.length > 1 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => remove(i)}
                style={{ padding: '4px 8px' }}
              >
                Position entfernen
              </button>
            )}
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn btn--secondary" onClick={add}>
            + Position hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}
