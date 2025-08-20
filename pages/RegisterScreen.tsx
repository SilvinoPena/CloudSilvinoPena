import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContabilidade } from '../hooks/useContabilidade';
import { Button, Input, Card, Checkbox } from '../components/ui/index';
import { LOGO_SP_AUTOMACAO_BASE64 } from '../constants';
import { CheckCircleIcon, XMarkIcon } from '../components/ui/Icons';

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
    <li className={`flex items-center text-sm ${isValid ? 'text-black' : 'text-black'}`}>
        {isValid ? <CheckCircleIcon className="h-4 w-4 mr-2 text-black" /> : <XMarkIcon className="h-4 w-4 mr-2 text-rose-500" />}
        {text}
    </li>
);

const RegisterScreen: React.FC = () => {
  const { registerUser, login } = useContabilidade();
  const navigate = useNavigate();
  
  const [formState, setFormState] = useState({
    nomeCompleto: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefone: '',
    termsAccepted: false,
  });

  const [error, setError] = useState('');

  const passwordValidations = useMemo(() => {
    const { password } = formState;
    return {
        has8Chars: password.length >= 8,
        hasUpper: /[A-Z]/.test(password),
        hasLower: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[@$!%*?&]/.test(password),
    };
  }, [formState.password]);

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);
  const doPasswordsMatch = formState.password && formState.password === formState.confirmPassword;
  const isFormValid = formState.nomeCompleto && formState.email && isPasswordValid && doPasswordsMatch && formState.termsAccepted;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
        setError("Por favor, preencha todos os campos corretamente.");
        return;
    }
    setError('');

    const registrationResult = registerUser({
        nomeCompleto: formState.nomeCompleto,
        email: formState.email,
        password: formState.password,
        telefone: formState.telefone,
    });
    
    if (registrationResult.success) {
        const loginResult = login(formState.email, formState.password);
        if (loginResult.success) {
            navigate('/');
        } else {
            setError("Falha ao fazer login após o cadastro. Por favor, tente fazer login manualmente.");
            navigate('/login');
        }
    } else {
        setError(registrationResult.message);
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center py-12">
      <div className="max-w-md w-full px-6">
        <div className="flex justify-center mb-4">
          <img src={LOGO_SP_AUTOMACAO_BASE64} alt="SP Automação Logo" className="h-20 w-auto" />
        </div>
        <h1 className="text-3xl font-bold text-center text-black mb-2">Crie sua Conta</h1>
        <p className="text-center text-black mb-8">Comece a gerenciar sua contabilidade.</p>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {error && <p className="text-center text-sm text-rose-600 bg-rose-100 p-2 rounded-md">{error}</p>}
             <Input 
              label="Nome Completo"
              id="nomeCompleto"
              name="nomeCompleto"
              value={formState.nomeCompleto}
              onChange={handleInputChange}
              required
            />
            <Input 
              label="Email"
              id="email"
              name="email"
              type="email"
              value={formState.email}
              onChange={handleInputChange}
              required
            />
            <Input 
              label="Telefone (Opcional)"
              id="telefone"
              name="telefone"
              type="tel"
              value={formState.telefone}
              onChange={handleInputChange}
            />
            <Input 
              label="Senha"
              id="password"
              name="password"
              type="password"
              value={formState.password}
              onChange={handleInputChange}
              required
            />
             <Input 
              label="Confirme a Senha"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formState.confirmPassword}
              onChange={handleInputChange}
              required
            />
             <div className="p-3 bg-blue-50 rounded-md">
                <ul className="space-y-1">
                    <PasswordRequirement isValid={passwordValidations.has8Chars} text="Pelo menos 8 caracteres" />
                    <PasswordRequirement isValid={passwordValidations.hasUpper} text="Uma letra maiúscula" />
                    <PasswordRequirement isValid={passwordValidations.hasLower} text="Uma letra minúscula" />
                    <PasswordRequirement isValid={passwordValidations.hasNumber} text="Um número" />
                    <PasswordRequirement isValid={passwordValidations.hasSpecial} text="Um caractere especial (@$!%*?&)" />
                </ul>
            </div>
            <Checkbox
                id="termsAccepted"
                name="termsAccepted"
                checked={formState.termsAccepted}
                onChange={handleInputChange}
                label={
                    <span>
                        Eu li e aceito os{' '}
                        <a href="#" className="font-medium text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>
                        Termos de Uso
                        </a>
                    </span>
                }
                required
            />
            <Button type="submit" className="w-full" variant="primary" disabled={!isFormValid}>
              Criar Conta
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-black">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterScreen;