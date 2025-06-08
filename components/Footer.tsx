import React from 'react';
import { SCHOOL_NAME } from '../constants';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-slate-100 border-t border-slate-200 text-slate-600 py-6 text-center mt-12">
      <div className="container mx-auto px-4">
        <p className="text-sm">&copy; {currentYear} {SCHOOL_NAME}. Todos los derechos reservados.</p>
        <p className="text-xs mt-1">Herramienta pedagógica desarrollada para demostración.</p>
      </div>
    </footer>
  );
};

export default Footer;