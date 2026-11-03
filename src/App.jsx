import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './lib/app-context.jsx';
import { Layout } from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Today from './pages/Today.jsx';
import Enquiries from './pages/Enquiries.jsx';
import EnquiryDetail from './pages/EnquiryDetail.jsx';
import { Quotes, FollowUps } from './pages/Quotes.jsx';
import { Jobs, JobDetail } from './pages/Jobs.jsx';
import Report from './pages/Report.jsx';
import Settings from './pages/Settings.jsx';

function RequireAuth({ children }) {
  const { ready } = useApp();
  if (!ready) return <Loading />;
  return children;
}

function OfficeOnly({ children }) {
  const { user } = useApp();
  return user?.role === 'jobsheets' ? <Navigate to="/jobs" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/invite/:token" element={<Navigate to="/" replace />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<OfficeOnly><Dashboard /></OfficeOnly>} />
        <Route path="today" element={<OfficeOnly><Today /></OfficeOnly>} />
        <Route path="enquiries" element={<OfficeOnly><Enquiries /></OfficeOnly>} />
        <Route path="enquiries/:id" element={<OfficeOnly><EnquiryDetail /></OfficeOnly>} />
        <Route path="quotes" element={<OfficeOnly><Quotes /></OfficeOnly>} />
        <Route path="follow-ups" element={<OfficeOnly><FollowUps /></OfficeOnly>} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="report" element={<OfficeOnly><Report /></OfficeOnly>} />
        <Route path="settings" element={<OfficeOnly><Settings /></OfficeOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
