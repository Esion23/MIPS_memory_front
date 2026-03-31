import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { IdePage } from './pages/Ide';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<IdePage />} />
      </Routes>
    </Router>
  );
}

export default App;
