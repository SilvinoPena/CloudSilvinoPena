


import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}
export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white shadow-md rounded-lg ${className}`}>
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'sm';
}
export const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', size = 'default', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    primary: 'bg-blue-600 text-black hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-black border border-blue-300 hover:bg-blue-50 focus:ring-blue-500',
    danger: 'bg-rose-600 text-black hover:bg-rose-700 focus:ring-rose-600',
  };
  const sizeClasses = {
    default: 'px-4 py-2',
    sm: 'p-1 h-7 w-7',
  };
  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}
export const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-black mb-1">{label}</label>}
        <input id={id} className={`w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black bg-white ${props.className || ''}`} {...props} />
    </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-black mb-1">{label}</label>
        <textarea id={id} rows={3} className={`w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black bg-white ${props.className || ''}`} {...props} />
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    children: React.ReactNode;
}
export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-black mb-1">{label}</label>}
        <select id={id} className={`w-full px-3 py-2 border border-blue-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black ${props.className || ''}`} {...props}>
            {children}
        </select>
    </div>
);


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-blue-50 rounded-lg shadow-xl w-full max-w-2xl mx-4 relative" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-blue-200 bg-blue-100 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-black">{title}</h3>
            <button onClick={onClose} className="text-black hover:text-gray-700 text-2xl leading-none">&times;</button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Spinner: React.FC = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
);

// Alert Components
interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}
export const Alert: React.FC<AlertProps> = ({ children, variant = 'default', className = '' }) => {
    const variantClasses = {
        default: 'bg-blue-100 border-blue-400 text-black',
        destructive: 'bg-rose-100 border-rose-400 text-black'
    };
    return (
        <div className={`p-4 border-l-4 ${variantClasses[variant]} ${className}`} role="alert">
            <div className="flex">
                {children}
            </div>
        </div>
    );
};

interface AlertDescriptionProps {
    children: React.ReactNode;
    className?: string;
}
export const AlertDescription: React.FC<AlertDescriptionProps> = ({ children, className = '' }) => (
    <div className={`ml-3 text-sm font-medium self-center text-black ${className}`}>{children}</div>
);

// Badge Component
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'success' | 'ativo' | 'passivo' | 'pl' | 'receita' | 'despesa' | 'custo';
  className?: string;
}
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variantClasses = {
    default: 'bg-blue-300 text-black',
    destructive: 'bg-rose-300 text-black',
    success: 'bg-emerald-300 text-black',
    ativo: 'bg-blue-300 text-black',
    passivo: 'bg-pink-300 text-black',
    pl: 'bg-violet-300 text-black',
    receita: 'bg-green-300 text-black',
    despesa: 'bg-amber-300 text-black',
    custo: 'bg-orange-300 text-black',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: React.ReactNode;
}
export const Checkbox: React.FC<CheckboxProps> = ({ label, id, ...props }) => (
    <div className="flex items-center">
        <input id={id} type="checkbox" className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500" {...props} />
        <label htmlFor={id} className="ml-2 block text-sm text-black">
            {label}
        </label>
    </div>
);