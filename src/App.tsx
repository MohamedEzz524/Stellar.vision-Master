import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import routes from './pages/Exportation';
import PageNotFound from './components/pageNotFound';
import CustomCursor from './global/CustomCursor';
import Preloader from './global/Preloader';
import { useLenis } from './hooks/useLenis';

function App() {
  useLenis();
  // Only show custom cursor on desktop (>= 1024px)
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  return (
    <main className="App">
      <Preloader />
      {isDesktop && <CustomCursor />}
      {/* Preloader is always mounted and covers the screen, so a null fallback
          is fine here — users will see the preloader (or a black bg on /booking
          routes) while the route chunk downloads. */}
      <Suspense fallback={null}>
        <Routes>
          {routes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </main>
  );
}

export default App;
