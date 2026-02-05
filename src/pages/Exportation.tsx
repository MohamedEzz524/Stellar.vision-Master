import Home from './home';
import CalendarPage from './calendar';
import BookingSuccessfulPage from './booking-successful';
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
  {
    path: '/booking-successful',
    title: 'Booking successful',
    element: <BookingSuccessfulPage />,
  },
];

export default routes;
