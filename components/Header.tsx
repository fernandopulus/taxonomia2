
import React from 'react';
import { APP_TITLE, SCHOOL_NAME } from '../constants';
import { DocumentChartBarIcon } from './IconComponents';

const Header: React.FC = () => {
  return (
    <header className="bg-primary-700 text-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
            <DocumentChartBarIcon className="w-10 h-10 text-primary-300" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
              <p className="text-sm text-primary-200">{SCHOOL_NAME}</p>
            </div>
          </div>
          {/* Navigation can be added here if needed */}
        </div>
      </div>
    </header>
  );
};

export default Header;
