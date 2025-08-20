import React from 'react';
import { formatCurrency } from '../../services/contabilidadeService';
import { Card } from '../ui';

interface GroupData {
  name: string;
  value: number;
}

interface Props {
  title: string;
  data: GroupData[];
  icon: React.ElementType;
  barColorClass: string;
  valueColorClass: string;
}

export const AnalysisGroupChart: React.FC<Props> = ({ title, data, icon: Icon, barColorClass, valueColorClass }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card className="p-6 h-full">
      <h4 className="text-lg font-semibold text-black mb-4 flex items-center">
        <Icon className={`h-6 w-6 mr-2 ${valueColorClass === 'text-black' ? 'text-emerald-600' : valueColorClass}`} />
        {title}
      </h4>
      {total > 0 ? (
        <ul className="space-y-4">
          {data.slice(0, 5).map((item) => (
            <li key={item.name}>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-medium text-black truncate">{item.name}</span>
                <span className={`font-semibold ${valueColorClass}`}>
                  {formatCurrency(item.value)}
                  <span className="text-xs text-black/70 ml-2">({((item.value / total) * 100).toFixed(1)}%)</span>
                </span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-2.5">
                <div
                  className={`${barColorClass} h-2.5 rounded-full`}
                  style={{ width: `${(item.value / total) * 100}%` }}
                ></div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-black/60 py-8">Não há dados para exibir neste período.</p>
      )}
    </Card>
  );
};
