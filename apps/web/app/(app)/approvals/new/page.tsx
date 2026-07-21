import Link from 'next/link';
import { CreateApprovalForm } from './form';

export default function NewApprovalPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <p className="subtle" style={{ marginBottom: 4 }}>
            <Link href="/approvals">Freigaben</Link> / Neu
          </p>
          <h1>Neue Freigabe erstellen</h1>
          <p className="subtle">
            Der Kunde erhält einen sicheren Link und kann ohne Login reagieren.
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 720 }}>
        <CreateApprovalForm />
      </div>
    </>
  );
}
