import React from 'react';
import { formatCurrency } from '../../services/contabilidadeService';

interface ReportRowProps {
  label: string;
  value: number | string;
  level: number;
  isTotal?: boolean;
  isSubTotal?: boolean;
  bold?: boolean;
  colSpan?: number;
  className?: string;
}

const ReportRow: React.FC<ReportRowProps> = ({ label, value, level, isTotal = false, isSubTotal = false, bold = false, colSpan, className = '' }) => (
  <tr className={`${isTotal ? 'bg-blue-100 font-bold' : ''} ${isSubTotal ? 'font-semibold bg-blue-50' : ''} ${bold ? 'font-bold' : ''} ${className}`}>
    <td style={{ paddingLeft: `${level * 1.5}rem` }} className="py-2 px-4" colSpan={colSpan}>
      {label}
    </td>
    {typeof value === 'number' && (
      <td className="py-2 px-4 text-right font-mono">{formatCurrency(value)}</td>
    )}
    {typeof value === 'string' && value && (
        <td className="py-2 px-4 text-right font-mono">{value}</td>
    )}
  </tr>
);

export default ReportRow;