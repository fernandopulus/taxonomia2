import React from 'react';
import type { Instrumento } from '../types';
import { EyeIcon, DownloadIcon } from './IconComponents';

interface HistoryTableProps {
  instrumentos: Instrumento[];
  onViewDetails: (instrumento: Instrumento) => void;
  onDownloadInstrumento: (instrumentoId: string) => void; // Now just needs ID
}

const HistoryTable: React.FC<HistoryTableProps> = ({ instrumentos, onViewDetails, onDownloadInstrumento }) => {
  if (instrumentos.length === 0) {
    return <p className="text-center text-slate-500 py-8">No hay instrumentos analizados en el historial que coincidan con los filtros.</p>;
  }

  return (
    <div className="overflow-x-auto shadow border-b border-slate-200 rounded-lg">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Fecha Análisis
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Nombre Archivo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Asignatura
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Nivel
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {instrumentos.map((instrumento) => (
            <tr key={instrumento.id} className="hover:bg-slate-50 transition-colors duration-150">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {new Date(instrumento.fechaAnalisis).toLocaleDateString('es-CL')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{instrumento.nombreArchivo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{instrumento.asignatura}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{instrumento.nivel}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => onViewDetails(instrumento)}
                  title="Ver Detalles"
                  className="text-primary-600 hover:text-primary-800 transition-colors duration-150 p-1 rounded-md hover:bg-primary-100"
                  aria-label={`Ver detalles de ${instrumento.nombreArchivo}`}
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDownloadInstrumento(instrumento.id)}
                  title="Descargar PDF"
                  className="text-green-600 hover:text-green-800 transition-colors duration-150 p-1 rounded-md hover:bg-green-100"
                  aria-label={`Descargar PDF de análisis para ${instrumento.nombreArchivo}`}
                >
                  <DownloadIcon className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryTable;