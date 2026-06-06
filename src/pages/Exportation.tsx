import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// Each route lives in its own chunk so users who only visit the home page
// don't pay the cost of downloading the booking flow code.
const Home = lazy(() => import('./home'));
const CalendarPage = lazy(() => import('./calendar'));
const BookingSuccessfulPage = lazy(() => import('./booking-successful'));

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
