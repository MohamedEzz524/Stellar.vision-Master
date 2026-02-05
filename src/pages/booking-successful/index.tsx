import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import timeSvg from '../../assets/time.svg';

type LocationState = {
  selectedDateTime: string;
  timezoneDisplay: string;
};

const BookingSuccessfulPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [secondsLeft, setSecondsLeft] = useState(10);

  // Redirect to home if no booking state (direct visit / refresh)
  useEffect(() => {
    if (!state) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  // Countdown and auto-redirect (single interval, cleanup on unmount)
  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          navigate('/', { replace: true });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state, navigate]);

  if (!state) return null;

  return (
    <div className="text-textPrimary flex min-h-[100dvh] w-full flex-col bg-black px-4 py-8 lg:px-0">
      <div className="mx-auto w-full max-w-2xl">
        {/* Info Section - same as Calendar confirm state */}
        <div className="[&>img>path]:text-textPrimary mb-8 space-y-4 lg:space-y-2">
          <p className="flex items-center gap-2 text-sm lg:text-lg">
            <img
              src={timeSvg}
              alt="time"
              className="stroke-textPrimary h-6 w-6 lg:h-8 lg:w-8"
            />
            15 min
          </p>
          <p className="flex items-center gap-2 text-sm opacity-100">
            <img
              src={timeSvg}
              alt="time"
              className="h-6 w-6 lg:h-8 lg:w-8"
            />
            Web conferencing details provided upon confirmation.
          </p>
          <p className="flex items-center gap-2 text-sm font-bold lg:text-lg">
            <img
              src={timeSvg}
              alt="time"
              className="h-6 w-6 lg:h-8 lg:w-8"
            />
            {state.selectedDateTime}
          </p>
          <p className="flex items-center gap-2 text-sm lg:text-lg">
            <img
              src={timeSvg}
              alt="time"
              className="h-6 w-6 lg:h-8 lg:w-8"
            />
            {state.timezoneDisplay}
          </p>
        </div>

        {/* Success Message - same as Calendar */}
        <div className="w-full space-y-6">
          <h3 className="font-grid text-2xl font-bold uppercase lg:text-[2rem]">
            Booking confirmed!
          </h3>
          <div className="rounded-md border border-green-500 bg-green-500/20 px-4 py-6 text-white">
            <p className="mb-4 text-sm font-semibold lg:text-lg">
              Thank you for your booking!
            </p>
            <p className="mb-2 text-xs lg:text-sm">
              Your booking has been submitted successfully. We'll send you a
              confirmation email shortly.
            </p>
            <p className="text-xs opacity-80 lg:text-sm">
              Web conferencing details will be provided upon confirmation.
            </p>
          </div>

          <Link
            to="/"
            className="calendar-day-available big mt-4 block w-full rounded-md px-4 py-3 text-center text-xs font-bold text-black uppercase lg:rounded-xl lg:px-6 lg:py-4 lg:text-lg"
          >
            Get back to home page in {secondsLeft}{' '}
            {secondsLeft === 1 ? 'second' : 'seconds'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessfulPage;
