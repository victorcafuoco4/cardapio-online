import { Route, Routes } from 'react-router-dom';
import { RotaProtegida } from './components/RotaProtegida';
import { PaginaCardapio } from './paginas/PaginaCardapio';
import { PaginaLogin } from './paginas/PaginaLogin';
import { PaginaPainel } from './paginas/PaginaPainel';

function App() {
  return (
    <Routes>
      <Route path="/" element={<PaginaCardapio />} />
      <Route path="/painel/login" element={<PaginaLogin />} />
      <Route
        path="/painel"
        element={
          <RotaProtegida>
            <PaginaPainel />
          </RotaProtegida>
        }
      />
    </Routes>
  );
}

export default App;
