# Storage Strategy (Attachments)

Fotos sind zentral für das Produkt. Block 6 lieferte die **Abstraktion** und den
lokalen Dev-Pfad; Block 8 konkretisiert den **produktiven Upload-Flow** (End-to-End
lokal, ohne externe Accounts) inkl. interner und kundenseitiger Anzeige.

## Upload-Flow (Block 8, zweistufig)

1. **Registrieren** (authentifiziert, `cases:annotate`):
   `POST /api/v1/approval-cases/:id/attachments` mit `{ fileName, contentType,
   sizeBytes, approvalItemId? }`. Validiert (nur Bildformate, ≤ 15 MB), erzeugt
   den `Attachment`-Datensatz (ohne `uploadedAt`) und liefert eine signierte
   Upload-URL (`upload.url`).
2. **Bytes hochladen**: der Client PUTet die Datei direkt an `upload.url`
   (`local`-Treiber: `PUT /api/v1/uploads/local/*`). Content-Type/Grösse werden
   **erneut** geprüft; `uploadedAt` + reale `sizeBytes` werden gestempelt und ein
   `CASE_ATTACHMENT_ADDED`-Audit-Event geschrieben.
3. **Anzeige**: erst nach `uploadedAt` sichtbar. Intern via
   `GET /approval-cases/:id/attachments` (signierte Download-URLs), kundenseitig
   pro Position in der öffentlichen View.

Cloud-Treiber (Supabase/R2) nutzen echte Provider-signierte URLs; die lokalen
`/uploads/local/*`-Routen werden dann **nicht** registriert.

## Prinzipien

- **Bytes liegen ausserhalb der DB.** Das `Attachment`-Modell speichert nur
  Metadaten + `storageKey` (Storage-Referenz), nie die Datei selbst.
- **Ein Treiber-Interface, mehrere Backends.** Auswahl per `STORAGE_DRIVER`.
- **Sicher ohne Credentials.** Default `local` (Dateisystem); Cloud-Treiber nur
  bei vorhandenen Credentials, sonst Fallback auf `local` mit Warnung.

## Treiber-Interface (`apps/api/src/lib/storage.ts`)

```ts
interface StorageDriver {
  name: string;
  put(key, data, contentType): Promise<{ key }>;
  getSignedUploadUrl(key, contentType): Promise<SignedUpload>; // direkter Client-Upload
  getSignedDownloadUrl(key): Promise<string>;
  delete(key): Promise<void>;
}
```

- **`local`** (implementiert): schreibt unter `STORAGE_LOCAL_DIR`, schützt vor
  Path-Traversal, liefert dev-URLs in stabiler Form.
- **`supabase` / `r2`** (Platzhalter, `UnconfiguredCloudDriver`): klar
  fehlschlagend bis zur echten Anbindung — `TODO PROVIDER SETUP`.

## Key-Schema (Empfehlung)

```
tenants/{tenantId}/cases/{caseId}/{uuid}-{safeFilename}
```

Tenant-präfixiert → einfache Isolation, Löschung und (später) tenant-weite
Bucket-Policies. Der `storageKey` wird (unique) auf der `Attachment`-Zeile
gespeichert; `buildAttachmentKey` slugifiziert den Dateinamen und verhindert
Path-Traversal.

## Signierte URLs (Konzept)

- **Upload:** Client fordert eine pre-signed URL an → lädt direkt zum Storage →
  meldet Erfolg + `storageKey` an die API. Entlastet die API von Bytes.
- **Download:** kurzlebige signierte Read-URL; keine öffentlichen Buckets.
- Der `local`-Treiber emuliert die Form über die API-Upload-Route (Block 8):
  die `/uploads/local/*`-URL ist das Dev-Äquivalent einer signierten URL — der
  unguessbare UUID-Key ist die Capability, und das Attachment muss registriert
  sein. Nur im `local`-Modus registriert.

## Sicherheit

- Keine öffentlichen Buckets; Zugriff nur über signierte, kurzlebige URLs.
- Validierung von Content-Type (nur Bilder) und Grösse **zweimal**: bei der
  Registrierung (Zod) und beim Byte-Empfang (Block 8).
- Löschung eines Falls/Attachments räumt auch die Objekte ab (`delete`).
- **Deferred (Block 9):** serverseitiges Re-Encoding/Thumbnailing + EXIF-Stripping;
  Cleanup verwaister, nie hochgeladener Attachment-Zeilen.

## Provider-Wahl (Supabase Storage vs. R2)

- **Supabase Storage:** nah an der DB (ein Provider), einfache Policies.
- **Cloudflare R2:** S3-kompatibel, günstiger Egress, gut mit Cloudflare-Edge.

**Default-Empfehlung:** mit Supabase starten (weniger Provider), R2 als Option,
wenn Egress/Edge wichtig wird. Endgültig: `TODO INFRA DECISION` (Block 8).
