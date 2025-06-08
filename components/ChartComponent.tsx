
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { BloomLevelData } from '../types';
import { BLOOM_TAXONOMY_LEVELS_ES } from '../constants';

interface ChartComponentProps {
  data: BloomLevelData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ChartComponent: React.FC<ChartComponentProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-slate-500">No hay datos de análisis para mostrar.</p>;
  }
  
  // Ensure data is sorted according to BLOOM_TAXONOMY_LEVELS_ES for consistent color mapping
  const sortedData = [...data].sort((a, b) => {
    return BLOOM_TAXONOMY_LEVELS_ES.indexOf(a.name) - BLOOM_TAXONOMY_LEVELS_ES.indexOf(b.name);
  });

  return (
    <div className="w-full h-72 sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{
            top: 5,
            right: 10, // Reduced right margin
            left: -10, // Reduced left margin
            bottom: 5,
          }}
          barGap={5} // Space between bars of the same group (not relevant for single bar)
          barCategoryGap="20%" // Space between categories (groups of bars)
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '0.5rem', borderColor: '#ccc' }}
            itemStyle={{ color: '#333' }}
            labelStyle={{ color: '#000', fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="questions" name="Nº Preguntas" radius={[4, 4, 0, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[BLOOM_TAXONOMY_LEVELS_ES.indexOf(entry.name) % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartComponent;
