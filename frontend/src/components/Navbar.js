import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="app-nav">
      <Link to="/" className="logo">ShoreChef</Link>
      <div className="nav-links">
        <Link to="/">Recipes</Link>
        <Link to="/chat">Cooking Assistant</Link>
      </div>
    </nav>
  );
}

export default Navbar;