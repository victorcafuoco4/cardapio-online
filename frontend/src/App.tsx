import { Route, Routes } from 'react-router-dom';
import { RotaProtegida } from './components/RotaProtegida';
import { PaginaAcompanhamento } from './paginas/PaginaAcompanhamento';
import { PaginaCardapio } from './paginas/PaginaCardapio';
import { PaginaLogin } from './paginas/PaginaLogin';
import { PaginaPainel } from './paginas/PaginaPainel';
import { PaginaPrecificacao } from './paginas/PaginaPrecificacao';

function App() {
  return (
    <Routes>
      <Route path="/" element={<PaginaCardapio />} />
      <Route path="/pedido/:token" element={<PaginaAcompanhamento />} />
      <Route path="/painel/login" element={<PaginaLogin />} />
      <Route
        path="/painel"
        element={
          <RotaProtegida>
            <PaginaPainel />
          </RotaProtegida>
        }
      />
      <Route
        path="/painel/precificacao"
        element={
          <RotaProtegida>
            <PaginaPrecificacao />
          </RotaProtegida>
        }
      />
    </Routes>
  );
}

export default App;
