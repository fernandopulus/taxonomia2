
import React, { useState } from 'react';
import { UploadIcon } from './IconComponents';
import { DEFAULT_ASIGNATURAS, DEFAULT_NIVELES } from '../constants';

interface FileUploadFormProps {
  onAnalyze: (fileName: string, asignatura: string, nivel: string) => void;
  isLoading: boolean;
}

const FileUploadForm: React.FC<FileUploadFormProps> = ({ onAnalyze, isLoading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [asignatura, setAsignatura] = useState<string>(DEFAULT_ASIGNATURAS[0] || '');
  const [nivel, setNivel] = useState<string>(DEFAULT_NIVELES[0] || '');
  const [fileNameDisplay, setFileNameDisplay] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setFileNameDisplay(event.target.files[0].name);
    } else {
      setSelectedFile(null);
      setFileNameDisplay('');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fileNameDisplay) {
      alert("Por favor, seleccione un archivo.");
      return;
    }
    if (!asignatura.trim()) {
      alert("Por favor, ingrese la asignatura.");
      return;
    }
    if (!nivel.trim()) {
      alert("Por favor, ingrese el nivel.");
      return;
    }
    onAnalyze(fileNameDisplay, asignatura, nivel);
    // Optionally clear form, or keep values for easy re-submission with changes
    // setSelectedFile(null); 
    // setFileNameDisplay('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="file-upload" className="block text-sm font-medium text-slate-700 mb-1">
          Instrumento de Evaluación (PDF o Word)
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
            <div className="flex text-sm text-slate-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <span>Seleccione un archivo</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
              </label>
              <p className="pl-1">o arrástrelo aquí</p>
            </div>
            <p className="text-xs text-slate-500">PDF, DOC, DOCX</p>
            {fileNameDisplay && <p className="text-sm text-slate-700 pt-2">Archivo: {fileNameDisplay}</p>}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="asignatura" className="block text-sm font-medium text-slate-700">
          Asignatura
        </label>
        <select
          id="asignatura"
          name="asignatura"
          value={asignatura}
          onChange={(e) => setAsignatura(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm"
        >
          {DEFAULT_ASIGNATURAS.map(asig => <option key={asig} value={asig}>{asig}</option>)}
        </select>
         {/* <input
          type="text"
          name="asignatura"
          id="asignatura"
          value={asignatura}
          onChange={(e) => setAsignatura(e.target.value)}
          className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Ej: Matemáticas"
          required
        /> */}
      </div>

      <div>
        <label htmlFor="nivel" className="block text-sm font-medium text-slate-700">
          Nivel
        </label>
         <select
          id="nivel"
          name="nivel"
          value={nivel}
          onChange={(e) => setNivel(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm"
        >
          {DEFAULT_NIVELES.map(niv => <option key={niv} value={niv}>{niv}</option>)}
        </select>
        {/* <input
          type="text"
          name="nivel"
          id="nivel"
          value={nivel}
          onChange={(e) => setNivel(e.target.value)}
          className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Ej: 3° Medio TP"
          required
        /> */}
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analizando...' : 'Simular Análisis'}
        </button>
      </div>
    </form>
  );
};

export default FileUploadForm;
