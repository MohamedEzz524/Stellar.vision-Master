import { useNavigate } from 'react-router-dom';
import { useMagnetic } from '../../hooks/useMagnetic';

const PageNotFound = () => {
  const navigate = useNavigate();
  const backButtonRef = useMagnetic<HTMLButtonElement>();
  const homeButtonRef = useMagnetic<HTMLButtonElement>({ strength: 0.5 });

  return (
    <div className="bg-bgPrimary text-textPrimary relative z-10 flex min-h-screen w-full items-center justify-center p-4">
      {/* Background glow accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-20">
        <div className="bg-accentPrimary absolute -top-20 -left-20 h-60 w-60 rounded-full blur-[80px]" />
        <div className="bg-accentSecondary absolute -right-20 -bottom-20 h-60 w-60 rounded-full blur-[80px]" />
      </div>

      <div className="border-border bg-sidebar relative z-10 w-full max-w-md rounded-2xl border p-8 backdrop-blur-lg shadow-[var(--shadow)]">
        {/* 404 text */}
        <div className="font-grid mb-6 text-center">
          <span className="text-accentPrimary text-[5rem] leading-none">4</span>
          <span className="text-accentSecondary text-[5rem] leading-none">
            0
          </span>
          <span className="text-accentPrimary text-[5rem] leading-none">4</span>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold">Lost in the Void</h1>
        <p className="mb-6 text-center text-sm text-gray-300">
          The page you're looking for has drifted into the digital abyss.
        </p>

        {/* Navigation buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            ref={backButtonRef}
            type="button"
            onClick={() => navigate(-1)}
            data-cursor="link"
            className="border-accentPrimary text-textPrimary hover:bg-accentPrimary/20 trans-colors flex-1 rounded-lg border px-6 py-3 sm:flex-none"
          >
            ← Go Back
          </button>
          <button
            ref={homeButtonRef}
            type="button"
            onClick={() => navigate('/')}
            data-cursor="cta"
            data-cursor-label="Home"
            className="bg-accentPrimary hover:bg-accentHover text-textPrimary trans-colors flex-1 rounded-lg px-6 py-3 sm:flex-none"
          >
            Return Home
          </button>
        </div>

        {/* Corner accents */}
        <div className="border-accentPrimary absolute -top-4 -left-4 h-8 w-8 rounded-full border-2 opacity-70" />
        <div className="border-accentSecondary absolute -right-4 -bottom-4 h-6 w-6 rounded-full border-2 opacity-70" />
      </div>
    </div>
  );
};

export default PageNotFound;
