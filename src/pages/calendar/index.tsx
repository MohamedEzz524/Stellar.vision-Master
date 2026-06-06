import { createElement } from 'react';
import { Link } from 'react-router-dom';
import Calendar from '../../components/Calendar';

// Wistia scripts are loaded by the Calendar component itself (it renders here
// as variant="page"). No duplicate loader needed.

const CalendarPage = () => {
  return (
    <div className="min-h-[100dvh] w-full bg-black text-white">
      <style>{`
        wistia-player[media-id='85rxfbge97']:not(:defined) {
          background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/85rxfbge97/swatch');
          display: block;
          filter: blur(5px);
          padding-top: 60%;
        }
        .video-mask-reveal {
          clip-path: inset(50% 50% 50% 50%);
          animation: videoMaskReveal 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes videoMaskReveal {
          to {
            clip-path: inset(0 0 0 0);
          }
        }
      `}</style>

      {/* Back to home - top left */}
      <div className="sticky top-0 left-0 z-[10] mb-5 flex justify-start p-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-normal text-white uppercase hover:underline lg:text-lg"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </div>

      {/* Wistia video at top - same max-width as calendar grid, mask reveal from center */}
      <div className="mx-auto w-full max-w-2xl px-4 pb-6">
        <div className="video-mask-reveal">
          {createElement('wistia-player', {
            'media-id': '85rxfbge97',
            aspect: '1.6666666666666667',
          })}
        </div>
      </div>

      {/* Calendar - always started, no drawer behavior */}
      <Calendar variant="page" />
    </div>
  );
};

export default CalendarPage;
