import React from 'react';
import { Card } from '../ui';
import { formatCurrency } from '../../services/contabilidadeService';

interface BarData {
  label: string;
  value: number;
}

interface Props {
  data: BarData[];
  title: string;
}

export const BarChart: React.FC<Props> = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  // Adiciona um buffer de 20% ao valor máximo para que a barra mais alta não atinja o topo
  const chartTopValue = maxValue > 0 ? maxValue * 1.2 : 1000;

  return (
    <Card className="p-6">
      <h4 className="text-lg font-semibold text-black mb-1">{title}</h4>
      <p className="text-sm text-black mb-6">Comparativo com metas</p>
      {data.length > 0 ? (
        <div className="w-full h-64">
            <div className="flex justify-around items-end h-full border-l border-b border-blue-200 pl-2 pb-1 relative">
                {/* Y-Axis Labels (simple example) */}
                <div className="absolute left-[-5px] top-0 bottom-0 flex flex-col justify-between text-xs text-black/50 -translate-x-full py-1">
                    <span>{formatCurrency(chartTopValue).replace(/\s/g,'')}</span>
                    <span>{formatCurrency(0)}</span>
                </div>
                {data.map((item, index) => (
                    <div key={index} className="flex flex-col items-center w-1/5 group relative h-full justify-end">
                    <div className="absolute -top-7 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 z-10">
                        {formatCurrency(item.value)}
                    </div>
                    <div
                        className="w-3/4 bg-rose-200 hover:bg-rose-300 transition-colors rounded-t-md"
                        style={{ height: `${(item.value / chartTopValue) * 100}%` }}
                    ></div>
                    <span className="text-xs text-center text-black mt-2 whitespace-nowrap overflow-hidden text-ellipsis w-full" title={item.label}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
      ) : (
         <div className="h-64 flex items-center justify-center">
            <p className="text-center text-black/60 py-8">Não há dados de despesa para exibir neste período.</p>
         </div>
      )}
    </Card>
  );
};
