import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingRoute from 'routes/LandingRoute';


const LayoutRouter: React.FC = () => (
  <Routes>
    <Route path="/" element={<LandingRoute />} />
  </Routes>
);

const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<LayoutRouter />} />
    </Routes>
  );
};


const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
