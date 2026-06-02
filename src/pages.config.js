/**
 * pages.config.js - Configuração de rotas das páginas
 * 
 * Este arquivo é AUTO-GERADO. Não adicione imports nem modifique PAGES manualmente.
 * As páginas são registradas quando você cria arquivos na pasta ./paginas/.
 * 
 * ÚNICO VALOR EDITÁVEL: mainPage
 * Controla qual página abre primeiro quando usuários acessam o app.
 * 
 * Exemplo de estrutura:
 * 
 *   import Inicio from './paginas/Inicio';
 *   import Painel from './paginas/Painel';
 *   import Configuracoes from './paginas/Configuracoes';
 *   
 *   export const PAGES = {
 *       "Inicio": Inicio,
 *       "Painel": Painel,
 *       "Configuracoes": Configuracoes,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "Inicio",
 *       Pages: PAGES,
 *   };
 * 
 * Exemplo com Layout (envolve todas as páginas):
 *
 *   import Inicio from './paginas/Inicio';
 *   import Configuracoes from './paginas/Configuracoes';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Inicio": Inicio,
 *       "Configuracoes": Configuracoes,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Inicio",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * Para alterar a página inicial de Inicio para Painel, use find_replace:
 *   Old: mainPage: "Inicio",
 *   New: mainPage: "Painel",
 *
 * O valor de mainPage deve corresponder exatamente a uma chave em PAGES.
 */
import Painel from './paginas/Painel';
import Landing from './paginas/Landing';
import Login from './paginas/Login';
import Cadastro from './paginas/Cadastro';
import RecuperarSenha from './paginas/RecuperarSenha';
import Dieta from './paginas/Dieta';
import AnaliseRefeicao from './paginas/AnaliseRefeicao';
import BoasVindas from './paginas/BoasVindas';
import Progresso from './paginas/Progresso';
import Configuracoes from './paginas/Configuracoes';
import Treino from './paginas/Treino';
import Memorial from './paginas/Memorial';
import Admin from './paginas/Admin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Landing": Landing,
    "Login": Login,
    "Cadastro": Cadastro,
    "RecuperarSenha": RecuperarSenha,
    "Painel": Painel,
    "Dieta": Dieta,
    "AnaliseRefeicao": AnaliseRefeicao,
    "BoasVindas": BoasVindas,
    "Progresso": Progresso,
    "Configuracoes": Configuracoes,
    "Treino": Treino,
    "Memorial": Memorial,
    "Admin": Admin,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};
