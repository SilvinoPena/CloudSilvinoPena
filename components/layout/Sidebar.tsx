import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, BuildingOfficeIcon, ListBulletIcon, PencilSquareIcon, BookOpenIcon, ChartBarIcon, CalculatorIcon, ShieldCheckIcon } from '../ui/Icons';
import { useContabilidade } from '../../hooks/useContabilidade';
import { LOGO_SP_AUTOMACAO_BASE64 } from '../../constants';

const navLinks = [
  { to: '/', text: 'Dashboard', icon: HomeIcon },
  { to: '/empresas', text: 'Empresas', icon: BuildingOfficeIcon },
  { to: '/plano-de-contas', text: 'Plano de Contas', icon: ListBulletIcon, requiresEmpresa: true },
  { to: '/livro-diario', text: 'Livro Diário', icon: PencilSquareIcon, requiresEmpresa: true },
  { to: '/livro-razao', text: 'Livro Razão', icon: BookOpenIcon, requiresEmpresa: true },
  { to: '/analise-financeira', text: 'Análise Financeira', icon: ChartBarIcon, requiresEmpresa: true },
  { to: '/fechamento', text: 'Fechamento', icon: CalculatorIcon, requiresEmpresa: true },
  { to: '/diagnostico', text: 'Diagnóstico', icon: ShieldCheckIcon, requiresEmpresa: true },
];

const Sidebar: React.FC = () => {
    const { empresaSelecionada } = useContabilidade();
    const location = useLocation();

    return (
        <div className="w-64 bg-blue-200 text-black flex flex-col no-print">
            <div className="h-16 flex items-center justify-start text-2xl font-bold border-b border-blue-300 px-4">
                <img src={LOGO_SP_AUTOMACAO_BASE64} alt="SP Automação Logo" className="h-9 w-auto mr-3" />
                <span className="shrink-0">G-ConFin</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
                {navLinks.map((link) => {
                    const isDisabled = link.requiresEmpresa && !empresaSelecionada;
                    const isActive = location.pathname === link.to;

                    const linkClasses = `
                        flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
                        ${isActive ? 'bg-blue-400 text-black' : 'text-black hover:bg-blue-300/60'}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `;
                    
                    const NavItem = (
                        <span className={linkClasses}>
                           <link.icon className="h-5 w-5 mr-3" />
                           {link.text}
                        </span>
                    );

                    if (isDisabled) {
                        return (
                            <div key={link.to} title="Selecione uma empresa para acessar esta área">
                                {NavItem}
                            </div>
                        );
                    }

                    return (
                        <NavLink key={link.to} to={link.to} className={linkClasses}>
                           <link.icon className="h-5 w-5 mr-3" />
                           {link.text}
                        </NavLink>
                    );
                })}
            </nav>
        </div>
    );
};

export default Sidebar;