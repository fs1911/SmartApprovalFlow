export default function SettingsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Einstellungen</h1>
          <p className="subtle">Workspace, Nachrichtenvorlagen und Team.</p>
        </div>
      </div>
      <div className="card">
        <div className="card__body">
          <h2>Nachrichtenvorlagen</h2>
          <p className="subtle">
            E-Mail- und SMS-Vorlagen für Freigabeanfragen und Erinnerungen werden in Block 4
            konfigurierbar. Eine Standardvorlage ist bereits hinterlegt.
          </p>
        </div>
      </div>
    </>
  );
}
