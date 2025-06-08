import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Extends jsPDF prototype
import type { Instrumento } from '../types';
import { APP_TITLE, SCHOOL_NAME, BLOOM_TAXONOMY_LEVELS_ES } from '../constants';

// Helper to extend jsPDF with autoTable typings if direct import doesn't provide them
// This is often needed with esm.sh or similar CDN setups
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const addHeader = (doc: jsPDF) => {
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40); // Dark gray
  doc.text(APP_TITLE, 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100); // Lighter gray
  doc.text(SCHOOL_NAME, 14, 28);
  doc.setLineWidth(0.5);
  doc.line(14, 32, doc.internal.pageSize.getWidth() - 14, 32); // Header line
};

const addFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages(); // Access internal property
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150); // Light gray
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Generado el: ${new Date().toLocaleDateString('es-CL')}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }
};

export const generateInstrumentoPDF = async (instrumento: Instrumento, chartImageDataUrl?: string): Promise<void> => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  addHeader(doc);
  let currentY = 40; // Starting Y position after header

  doc.setFontSize(14);
  doc.setTextColor(50, 50, 150); // Primary-like color
  doc.text("Informe de Análisis Pedagógico de Instrumento", 14, currentY);
  currentY += 10;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); // Black

  const details = [
    { title: "Nombre del Archivo:", value: instrumento.nombreArchivo },
    { title: "Asignatura:", value: instrumento.asignatura },
    { title: "Nivel:", value: instrumento.nivel },
    { title: "Fecha de Análisis:", value: new Date(instrumento.fechaAnalisis).toLocaleDateString('es-CL') },
  ];

  details.forEach(detail => {
    doc.text(`${detail.title} ${detail.value}`, 14, currentY);
    currentY += 7;
  });
  currentY += 5; // Extra space before table/chart

  // Table for Bloom Analysis
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 150);
  doc.text("Distribución Taxonomía de Bloom", 14, currentY);
  currentY += 8;

  const tableData = [];
  let totalQuestions = 0;
  BLOOM_TAXONOMY_LEVELS_ES.forEach(level => {
    totalQuestions += (instrumento.analisisBloom[level] || 0);
  });

  BLOOM_TAXONOMY_LEVELS_ES.forEach(level => {
    const questions = instrumento.analisisBloom[level] || 0;
    const percentage = totalQuestions > 0 ? ((questions / totalQuestions) * 100).toFixed(1) + "%" : "0.0%";
    tableData.push([level, questions.toString(), percentage]);
  });
  tableData.push(['Total', totalQuestions.toString(), totalQuestions > 0 ? '100.0%' : '0.0%']);

  doc.autoTable({
    startY: currentY,
    head: [['Nivel Taxonómico', 'Nº Preguntas', 'Porcentaje']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [22, 160, 133] }, // Teal-like color for header
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
    },
    didDrawPage: (data) => {
        // Only add header and footer once per page via the main addFooter call
    }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;


  // Add chart image if available
  if (chartImageDataUrl) {
    try {
      // Ensure there's space for the chart
      const chartHeight = 70; // Approximate height, adjust as needed
      const chartWidth = 180; // Approximate width to fit page
      if (currentY + chartHeight > doc.internal.pageSize.getHeight() - 20) { // Check if it fits
        doc.addPage();
        currentY = 20; // Reset Y on new page
        // No need to call addHeader/addFooter here, it's done at the end
      }
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 150);
      doc.text("Gráfico de Distribución", 14, currentY);
      currentY += 8;
      doc.addImage(chartImageDataUrl, 'PNG', 14, currentY, chartWidth, chartHeight);
      currentY += chartHeight + 10;
    } catch (e) {
      console.error("Error adding image to PDF:", e);
      doc.setTextColor(255,0,0);
      doc.text("Error al cargar imagen del gráfico.", 14, currentY);
      currentY += 7;
    }
  }

  addFooter(doc);
  doc.save(`Analisis_${instrumento.asignatura}_${instrumento.nombreArchivo.split('.')[0]}.pdf`);
};


export const generateConsolidadoPDF = async (
  instrumentos: Instrumento[],
  filtros: { asignatura: string, nivel: string }
): Promise<void> => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  addHeader(doc);
  let currentY = 40;

  doc.setFontSize(14);
  doc.setTextColor(50, 50, 150);
  doc.text("Informe Consolidado de Análisis Pedagógicos", 14, currentY);
  currentY += 10;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Filtros Aplicados:`, 14, currentY);
  currentY += 7;
  doc.text(`  Asignatura: ${filtros.asignatura || "Todas"}`, 14, currentY);
  currentY += 7;
  doc.text(`  Nivel: ${filtros.nivel || "Todos"}`, 14, currentY);
  currentY += 10;

  if (instrumentos.length === 0) {
    doc.text("No hay instrumentos para mostrar con los filtros seleccionados.", 14, currentY);
    addFooter(doc);
    doc.save(`Consolidado_Analisis_Vacio.pdf`);
    return;
  }

  const tableData = instrumentos.map(inst => {
    const fecha = new Date(inst.fechaAnalisis).toLocaleDateString('es-CL');
    const totalPreguntas = Object.values(inst.analisisBloom).reduce((sum, count) => sum + count, 0);
    
    // Determine predominant levels
    let predominantLevels = "N/A";
    if (totalPreguntas > 0) {
        const sortedLevels = BLOOM_TAXONOMY_LEVELS_ES
            .map(level => ({ name: level, count: inst.analisisBloom[level] || 0 }))
            .filter(l => l.count > 0)
            .sort((a, b) => b.count - a.count);
        
        predominantLevels = sortedLevels.slice(0, 2) // Top 2
            .map(l => `${l.name} (${((l.count / totalPreguntas) * 100).toFixed(0)}%)`)
            .join(', ');
        if(predominantLevels === "") predominantLevels = "Sin preguntas clasificadas";
    }


    return [
      fecha,
      inst.nombreArchivo,
      inst.asignatura,
      inst.nivel,
      totalPreguntas.toString(),
      predominantLevels
    ];
  });

  doc.autoTable({
    startY: currentY,
    head: [['Fecha Análisis', 'Nombre Archivo', 'Asignatura', 'Nivel', 'Total Preg.', 'Nivel(es) Predominante(s)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [63, 81, 181] }, // Indigo-like color for header
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 25 }, // Fecha
      1: { cellWidth: 40 }, // Nombre Archivo
      2: { cellWidth: 30 }, // Asignatura
      3: { cellWidth: 25 }, // Nivel
      4: { cellWidth: 15, halign: 'right' }, // Total Preg.
      5: { cellWidth: 'auto' }, // Predominante
    },
    didDrawPage: (data) => {
        // Footer handled globally
    }
  });

  addFooter(doc);
  const dateSuffix = new Date().toISOString().split('T')[0];
  doc.save(`Consolidado_Analisis_${dateSuffix}.pdf`);
};