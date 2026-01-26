import { HashRouter, Routes, Route, Navigate } from 'react-router';
import Slideshow from './components/slideshow/Slideshow';
import Manager from './components/manager/Manager';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Slideshow />} />

        <Route path="/dashboard" element={<Manager />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
