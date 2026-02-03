import Home from './home';
import CalendarPage from './calendar';
import type { RouteObject } from 'react-router-dom';

type ExtendedRoute = RouteObject & {
  title: string;
};

const routes: ExtendedRoute[] = [
  {
    path: '/',
    title: 'Home',
    element: <Home />,
  },
  {
    path: '/booking',
    title: 'Calendar',
    element: <CalendarPage />,
  },
];

export default routes;
