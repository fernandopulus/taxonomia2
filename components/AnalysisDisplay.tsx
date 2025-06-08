import React, { useRef } from 'react';
import type { Instrumento, BloomLevelData } from '../types';
import { BLOOM_TAXONOMY_LEVELS_ES } from '../constants';
import ChartComponent from './ChartComponent';
import { DownloadIcon } from './IconComponents';
import html2canvas from 'html2canvas';

interface AnalysisDisplayProps {
  instrumento: Instrumento;
  onDownloadIndividual: (instrumentoId: string, chartImageDataUrl?: string) => void;
  isGeneratingPdf: boolean;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ instrumento, onDownloadIndividual, isGeneratingPdf }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData: BloomLevelData[] = BLOOM_TAXONOMY_LEVELS_ES.map(level => ({
    name: level,
    questions: instrumento.analisisBloom[level] || 0,
  }));

  const totalQuestions = chartData.reduce((sum, item) => sum + item.questions, 0);

  const handleDownloadClick = async () => {
    if (!chartRef.current) {
      onDownloadIndividual(instrumento.id); // Proceed without chart if ref is not available
      return;
    }
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // Improve resolution
        backgroundColor: '#ffffff', // Ensure background is white for non-transparent capture
        useCORS: true, // If chart uses external resources, though unlikely for Recharts
        logging: false, 
      });
      const imageDataUrl = canvas.toDataURL('image/png', 0.95); // High quality PNG
      onDownloadIndividual(instrumento.id, imageDataUrl);
    } catch (error) {
      console.error("Error capturing chart for PDF:", error);
      onDownloadIndividual(instrumento.id); // Proceed without chart on error
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary-700">Detalles del Instrumento</h3>
        <div className="mt-2 text-sm text-slate-600 space-y-1">
          <p><span className="font-medium">Archivo:</span> {instrumento.nombreArchivo}</p>
          <p><span className="font-medium">Asignatura:</span> {instrumento.asignatura}</p>
          <p><span className="font-medium">Nivel:</span> {instrumento.nivel}</p>
          <p><span className="font-medium">Fecha de Análisis:</span> {new Date(instrumento.fechaAnalisis).toLocaleDateString('es-CL')}</p>
        </div>
      </div>

      <div ref={chartRef} className="bg-white p-2 rounded"> {/* Added bg-white and padding for better capture */}
        <h3 className="text-lg font-semibold text-primary-700 mb-2">Distribución Taxonomía de Bloom</h3>
        <ChartComponent data={chartData} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-primary-700 mb-2">Tabla de Distribución</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-md">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Nivel Taxonómico
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Nº Preguntas
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Porcentaje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {BLOOM_TAXONOMY_LEVELS_ES.map((level) => {
                const questions = instrumento.analisisBloom[level] || 0;
                const percentage = totalQuestions > 0 ? ((questions / totalQuestions) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={level}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{level}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{questions}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{percentage}%</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-3 text-sm text-slate-700">Total</td>
                <td className="px-4 py-3 text-sm text-slate-700">{totalQuestions}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{totalQuestions > 0 ? '100.0%' : '0.0%'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div>
        <button
          onClick={handleDownloadClick}
          disabled={isGeneratingPdf}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-wait"
        >
          <DownloadIcon className="mr-2 -ml-1 h-5 w-5" />
          {isGeneratingPdf ? 'Generando PDF...' : 'Descargar Análisis Individual'}
        </button>
      </div>
    </div>
  );
};

export default AnalysisDisplay;