# Storage Strategy (Attachments)

Fotos sind zentral für das Produkt. Block 6 liefert die **Abstraktion** und den
lokalen Dev-Pfad; die produktive Upload-UI folgt später (Roadmap Block 8).

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
tenants/{tenantId}/cases/{caseId}/{attachmentId}-{safeFilename}
```

Tenant-präfixiert → einfache Isolation, Löschung und (später) tenant-weite
Bucket-Policies. Der `storageKey` wird auf der `Attachment`-Zeile gespeichert.

## Signierte URLs (Konzept)

- **Upload:** Client fordert eine pre-signed URL an → lädt direkt zum Storage →
  meldet Erfolg + `storageKey` an die API. Entlastet die API von Bytes.
- **Download:** kurzlebige signierte Read-URL; keine öffentlichen Buckets.
- Der `local`-Treiber emuliert die Form über eine API-Upload-Route (Block 8).

## Sicherheit

- Keine öffentlichen Buckets; Zugriff nur über signierte, kurzlebige URLs.
- Validierung von Content-Type/Grösse beim Ausstellen der Upload-URL (Block 8).
- Löschung eines Falls/Attachments räumt auch die Objekte ab (`delete`).

## Provider-Wahl (Supabase Storage vs. R2)

- **Supabase Storage:** nah an der DB (ein Provider), einfache Policies.
- **Cloudflare R2:** S3-kompatibel, günstiger Egress, gut mit Cloudflare-Edge.

**Default-Empfehlung:** mit Supabase starten (weniger Provider), R2 als Option,
wenn Egress/Edge wichtig wird. Endgültig: `TODO INFRA DECISION` (Block 8).
