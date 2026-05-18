import { Toaster } from "@/components/ui/feedback/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const legacyPageRedirects = {
  Dashboard: "Painel",
  Workout: "Treino",
  Diet: "Dieta",
  MealAnalysis: "AnaliseRefeicao",
  Onboarding: "BoasVindas",
  Progress: "Progresso",
  Settings: "Configuracoes",
};
const publicPageNames = new Set(["Landing", "Login", "Cadastro", "RecuperarSenha"]);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PrivatePage = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/Login" replace />;
};

const PublicPage = ({ children }) => children;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Mostra spinner de carregamento enquanto verifica as configurações públicas do app ou a autenticação
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Trata erros de autenticação
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
  // Redireciona para login automaticamente
      navigateToLogin();
      return null;
    }
  }

  // Renderiza a aplicação principal
  return (
    <Routes>
      <Route path="/" element={
        <PublicPage>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </PublicPage>
      } />
      {Object.entries(Pages).map(([path, Page]) => {
        const isPublic = publicPageNames.has(path);
        const pageElement = (
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
        );
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              isPublic
                ? <PublicPage>{pageElement}</PublicPage>
                : <PrivatePage>{pageElement}</PrivatePage>
            }
          />
        );
      })}
      {Object.entries(legacyPageRedirects).map(([from, to]) => (
        <Route key={from} path={`/${from}`} element={<Navigate to={`/${to}`} replace />} />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
