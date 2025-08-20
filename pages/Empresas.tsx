import React, { useState, useEffect } from 'react';
import { useContabilidade } from '../hooks/useContabilidade';
import { Empresa } from '../types';
import { Button, Input, Card, Modal, Select } from '../components/ui/index';
import { PencilSquareIcon, TrashIcon } from '../components/ui/Icons';

const Empresas: React.FC = () => {
  const { empresas, addEmpresa, updateEmpresa, deleteEmpresa } = useContabilidade();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empresaEmEdicao, setEmpresaEmEdicao] = useState<Empresa | null>(null);

  const getInitialState = (): Omit<Empresa, 'id' | 'planoDeContas' | 'lancamentos' | 'userId'> => ({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    endereco: '',
    responsavel: '',
    telefone: '',
    email: '',
    regimeTributario: 'Simples Nacional',
    porte: 'ME',
    inicioExercicio: '',
  });
  
  const [formState, setFormState] = useState(getInitialState());

  useEffect(() => {
    if (empresaEmEdicao) {
        setFormState(empresaEmEdicao);
    } else {
        setFormState(getInitialState());
    }
  }, [empresaEmEdicao]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (empresa: Empresa | null = null) => {
    setEmpresaEmEdicao(empresa);
    setIsModalOpen(true);
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEmpresaEmEdicao(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (empresaEmEdicao) {
      updateEmpresa({ ...empresaEmEdicao, ...formState });
    } else {
      addEmpresa(formState);
    }
    handleCloseModal();
  };

  const handleDelete = (empresaId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta empresa e todos os seus dados? Esta ação não pode ser desfeita.")) {
      deleteEmpresa(empresaId);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-black">Empresas Cadastradas</h2>
        <Button onClick={() => handleOpenModal()}>Adicionar Empresa</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
            <table className="min-w-full">
                 <thead className="bg-blue-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Razão Social</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">CNPJ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Responsável</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-200">
                    {empresas.length > 0 ? (
                        empresas.map(empresa => (
                        <tr key={empresa.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-black">{empresa.razaoSocial}</div>
                                <div className="text-sm text-black">{empresa.nomeFantasia}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{empresa.cnpj}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{empresa.responsavel}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <Button variant="secondary" size="sm" onClick={() => handleOpenModal(empresa)} aria-label="Editar"><PencilSquareIcon className="h-4 w-4"/></Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(empresa.id)} aria-label="Excluir"><TrashIcon className="h-4 w-4"/></Button>
                            </td>
                        </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="text-center text-black py-8">Nenhuma empresa cadastrada.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={empresaEmEdicao ? "Editar Empresa" : "Cadastrar Nova Empresa"}>
        <form onSubmit={handleSubmit} className="space-y-4">
           <Input 
            label="Razão Social"
            name="razaoSocial"
            value={formState.razaoSocial}
            onChange={handleInputChange}
            required
          />
          <Input 
            label="Nome Fantasia"
            name="nomeFantasia"
            value={formState.nomeFantasia}
            onChange={handleInputChange}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CNPJ"
              name="cnpj"
              value={formState.cnpj}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Telefone"
              name="telefone"
              value={formState.telefone}
              onChange={handleInputChange}
              required
            />
          </div>
           <Input
            label="Endereço"
            name="endereco"
            value={formState.endereco}
            onChange={handleInputChange}
            required
          />
           <div className="grid grid-cols-2 gap-4">
             <Input
                label="Responsável"
                name="responsavel"
                value={formState.responsavel}
                onChange={handleInputChange}
                required
            />
            <Input
                label="E-mail"
                name="email"
                type="email"
                value={formState.email}
                onChange={handleInputChange}
                required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Regime Tributário" name="regimeTributario" value={formState.regimeTributario} onChange={handleInputChange} required>
                <option value="Simples Nacional">Simples Nacional</option>
                <option value="Lucro Presumido">Lucro Presumido</option>
                <option value="Lucro Real">Lucro Real</option>
            </Select>
            <Select label="Porte da Empresa" name="porte" value={formState.porte} onChange={handleInputChange} required>
                <option value="MEI">MEI</option>
                <option value="ME">ME</option>
                <option value="EPP">EPP</option>
                <option value="Média">Média</option>
                <option value="Grande">Grande</option>
            </Select>
          </div>
          <Input
            label="Data de Início do Exercício"
            name="inicioExercicio"
            type="date"
            value={formState.inicioExercicio}
            onChange={handleInputChange}
            required
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" variant="primary">{empresaEmEdicao ? "Salvar Alterações" : "Salvar Empresa"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Empresas;