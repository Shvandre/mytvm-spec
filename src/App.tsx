import React from 'react';
import './App.css';
import ThemeToggle from './components/ThemeToggle';
import InstructionsTable from './components/InstructionsTable';

function App() {
  return (
    <div className="App">
      <ThemeToggle />
      
      <header className="header">
        <div className="container">
          <h1>TVM Instructions</h1>
          <p className="description">
            TON Virtual Machine (TVM) instructions database with search and filtering capabilities.
          </p>
        </div>
      </header>
      
      <main className="main">
        <div className="container">
          <InstructionsTable />
        </div>
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} MyTvmSpec</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
