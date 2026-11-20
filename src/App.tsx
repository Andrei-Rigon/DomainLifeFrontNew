import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AgendaPage } from './features/agenda/AgendaPage';
import { NotesPage } from './features/notes/NotesPage';
import { NoteDocPage } from './features/notes/NoteDocPage';
import { ObjectivesPage } from './features/objectives/ObjectivesPage';
import { CountsPage } from './features/counts/CountsPage';
import { OverviewPage } from './features/finance/OverviewPage';
import { EntriesPage } from './features/finance/EntriesPage';
import { PayablesPage, ReceivablesPage } from './features/finance/InstallmentsPage';
import { SettingsPage } from './features/finance/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="notas/:id" element={<NoteDocPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="agendamentos" element={<AgendaPage />} />
          <Route path="notas" element={<NotesPage />} />
          <Route path="objetivos" element={<ObjectivesPage />} />
          <Route path="financeiro" element={<OverviewPage />} />
          <Route path="lancamentos" element={<EntriesPage />} />
          <Route path="pagar" element={<PayablesPage />} />
          <Route path="receber" element={<ReceivablesPage />} />
          <Route path="contas" element={<CountsPage />} />
          <Route path="ajustes-financeiros" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
