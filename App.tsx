
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import FileUploadForm from './components/FileUploadForm';
import AnalysisDisplay from './components/AnalysisDisplay';
import HistoryTable from './components/HistoryTable';
import { FilterIcon, DownloadIcon, DocumentChartBarIcon } from './components/IconComponents';
import type { Instrumento } from './types';
import { simulateBloomAnalysis } from './services/analysisService';
import { loadInstrumentosFromStorage, saveInstrumentosToStorage } from './services/storageService';
import { generateInstrumentoPDF, generateConsolidadoPDF } from './services/pdfService'; // Updated import
// import { DEFAULT_ASIGNATURAS, DEFAULT_NIVELES } from './constants'; // Not directly used here anymore


const App: React.FC = () => {
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [instrumentoActualParaAnalisis, setInstrumentoActualParaAnalisis] = useState<Instrumento | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For file analysis
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false); // For PDF generation
  
  const [filtroAsignatura, setFiltroAsignatura] = useState<string>('');
  const [filtroNivel, setFiltroNivel] = useState<string>('');

  useEffect(() => {
    const loadedInstrumentos = loadInstrumentosFromStorage();
    setInstrumentos(loadedInstrumentos);
  }, []);

  useEffect(() => {
    saveInstrumentosToStorage(instrumentos);
  }, [instrumentos]);

  const handleNewAnalysis = useCallback((fileName: string, asignatura: string, nivel: string) => {
    setIsLoading(true);
    setTimeout(() => {
      const nuevoInstrumento: Instrumento = {
        id: crypto.randomUUID(),
        nombreArchivo: fileName,
        asignatura,
        nivel,
        fechaAnalisis: new Date().toISOString(),
        analisisBloom: simulateBloomAnalysis(),
      };
      setInstrumentos(prevInstrumentos => [nuevoInstrumento, ...prevInstrumentos]);
      setInstrumentoActualParaAnalisis(nuevoInstrumento);
      setIsLoading(false);
      const analysisSection = document.getElementById('analysis-section');
      if (analysisSection && window.innerWidth < 768) {
        analysisSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 1000);
  }, []);

  const handleViewHistoricalAnalysis = useCallback((instrumento: Instrumento) => {
    setInstrumentoActualParaAnalisis(instrumento);
    const analysisSection = document.getElementById('analysis-section');
    if (analysisSection) {
        analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleDownloadInstrumentoPDF = useCallback(async (instrumentoId: string, chartImageDataUrl?: string) => {
    const instrumento = instrumentos.find(i => i.id === instrumentoId);
    if (instrumento) {
      setIsGeneratingPdf(true);
      try {
        await generateInstrumentoPDF(instrumento, chartImageDataUrl);
      } catch (error) {
        console.error("Error generating individual PDF:", error);
        alert("Hubo un error al generar el PDF del instrumento.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  }, [instrumentos]);

  const filteredInstrumentos = useMemo(() => {
    return instrumentos.filter(inst => {
      const asignaturaMatch = filtroAsignatura ? inst.asignatura === filtroAsignatura : true;
      const nivelMatch = filtroNivel ? inst.nivel === filtroNivel : true;
      return asignaturaMatch && nivelMatch;
    });
  }, [instrumentos, filtroAsignatura, filtroNivel]);

  const handleDownloadConsolidadoPDF = useCallback(async () => {
    if (filteredInstrumentos.length === 0) {
      alert("No hay instrumentos en el historial filtrado para generar el consolidado.");
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateConsolidadoPDF(filteredInstrumentos, { asignatura: filtroAsignatura, nivel: filtroNivel });
    } catch (error) {
      console.error("Error generating consolidated PDF:", error);
      alert("Hubo un error al generar el PDF consolidado.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [filteredInstrumentos, filtroAsignatura, filtroNivel, setIsGeneratingPdf]);
  
  const uniqueAsignaturas = useMemo(() => {
    const allAsignaturas = instrumentos.map(i => i.asignatura);
    return [...new Set(allAsignaturas)].sort((a,b) => a.localeCompare(b));
  }, [instrumentos]);

  const uniqueNiveles = useMemo(() => {
    const allNiveles = instrumentos.map(i => i.nivel);
    return [...new Set(allNiveles)].sort((a,b) => a.localeCompare(b));
  }, [instrumentos]);


  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <section className="grid md:grid-cols-2 gap-6 lg:gap-8 items-start">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-primary-700 mb-4">Nuevo Análisis de Instrumento</h2>
            <FileUploadForm onAnalyze={handleNewAnalysis} isLoading={isLoading} />
          </div>
          <div id="analysis-section" className="bg-white p-6 rounded-xl shadow-lg min-h-[300px]">
            <h2 className="text-xl font-semibold text-primary-700 mb-4">Visualización del Análisis</h2>
            {instrumentoActualParaAnalisis ? (
              <AnalysisDisplay 
                instrumento={instrumentoActualParaAnalisis} 
                onDownloadIndividual={handleDownloadInstrumentoPDF}
                isGeneratingPdf={isGeneratingPdf}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-10">
                <DocumentChartBarIcon className="w-16 h-16 text-slate-300 mb-4" />
                <p>Analice un instrumento para ver los resultados aquí.</p>
                <p className="text-sm">O seleccione un instrumento del historial.</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold text-primary-700">Historial de Instrumentos Analizados</h2>
            <button
              onClick={handleDownloadConsolidadoPDF}
              disabled={filteredInstrumentos.length === 0 || isGeneratingPdf}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait"
            >
              <DownloadIcon className="mr-2 -ml-1 h-5 w-5" />
              {isGeneratingPdf ? 'Generando PDF...' : 'Descargar Consolidado'}
            </button>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label htmlFor="filter-asignatura" className="block text-sm font-medium text-slate-700">Filtrar por Asignatura</label>
              <select
                id="filter-asignatura"
                value={filtroAsignatura}
                onChange={(e) => setFiltroAsignatura(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm"
              >
                <option value="">Todas las Asignaturas</option>
                {uniqueAsignaturas.map(asig => <option key={asig} value={asig}>{asig}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filter-nivel" className="block text-sm font-medium text-slate-700">Filtrar por Nivel</label>
              <select
                id="filter-nivel"
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm"
              >
                <option value="">Todos los Niveles</option>
                {uniqueNiveles.map(niv => <option key={niv} value={niv}>{niv}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 md:col-span-1 flex items-end">
                 <button
                    onClick={() => { setFiltroAsignatura(''); setFiltroNivel(''); }}
                    className="mt-1 w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <FilterIcon className="mr-2 -ml-1 h-5 w-5" />
                    Limpiar Filtros
                  </button>
            </div>
          </div>
          
          <HistoryTable
            instrumentos={filteredInstrumentos}
            onViewDetails={handleViewHistoricalAnalysis}
            onDownloadInstrumento={handleDownloadInstrumentoPDF} // Pass the main handler
          />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default App;
