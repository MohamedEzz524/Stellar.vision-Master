import { Route, Routes } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import routes from './pages/Exportation';
import PageNotFound from './components/pageNotFound';
import CustomCursor from './global/CustomCursor';
import Preloader from './global/Preloader';
// import StarryBackground from './global/StarryBackground';
import { useLenis } from './hooks/useLenis';

function App() {
  useLenis();
  // Only show custom cursor on desktop (>= 1024px)
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  return (
    <main className="App">
      <Preloader />
      {isDesktop && <CustomCursor />}
      {/* <StarryBackground /> */}
      <Routes>
        {routes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </main>
  );
}

export default App;
