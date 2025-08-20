import React, { useState } from 'react';
import { useContabilidade } from '../hooks/useContabilidade';
import { Button, Input, Card } from '../components/ui/index';
import { LOGO_SP_AUTOMACAO_BASE64 } from '../constants';
import { Link, useNavigate } from 'react-router-dom';

const LoginScreen: React.FC = () => {
  const { login } = useContabilidade();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = login(email, password);
    if (!result.success) {
      setError(result.message);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="flex justify-center mb-4">
          <img src={LOGO_SP_AUTOMACAO_BASE64} alt="SP Automação Logo" className="h-24 w-auto" />
        </div>
        <h1 className="text-3xl font-bold text-center text-black mb-2">G-ConFin</h1>
        <p className="text-center text-black mb-8">Sua plataforma de gestão contábil e financeira</p>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {error && <p className="text-center text-sm text-rose-600 bg-rose-100 p-2 rounded-md">{error}</p>}
            <Input 
              label="Email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input 
              label="Senha"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" variant="primary">
              Entrar
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-black">
          Não tem uma conta?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;