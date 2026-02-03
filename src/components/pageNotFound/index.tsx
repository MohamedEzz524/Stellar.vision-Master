import { useNavigate } from 'react-router-dom';

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="main-body z-10 flex min-h-screen w-full items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden opacity-20">
        <div className="bg-accentPrimary absolute -top-20 -left-20 h-60 w-60 rounded-full blur-[80px]" />
        <div className="bg-accentSecondary absolute -right-20 -bottom-20 h-60 w-60 rounded-full blur-[80px]" />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--sidebar)] p-8 shadow-[var(--shadow)] backdrop-blur-lg">
        {/* Glitch-style 404 text */}
        <div className="font-fugaz mb-6 text-center">
          <span className="text-accentPrimary text-[5rem] leading-none">4</span>
          <span className="text-accentSecondary text-[5rem] leading-none">
            0
          </span>
          <span className="text-accentPrimary text-[5rem] leading-none">4</span>
        </div>

        <h1 className="h1 mb-2 text-center">Lost in the Void</h1>
        <p className="text-body mb-6 text-center">
          The page you're looking for has drifted into the digital abyss.
        </p>

        {/* Navigation buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate(-1)}
            className="btn-neon trans-colors flex-1 sm:flex-none"
          >
            ← Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-neon trans-colors bg-accentPrimary hover:bg-accentHover flex-1 sm:flex-none"
          >
            Return Home
          </button>
        </div>

        {/* Decorative elements */}
        <div className="border-accentPrimary absolute -top-4 -left-4 h-8 w-8 rounded-full border-2 opacity-70" />
        <div className="border-accentSecondary absolute -right-4 -bottom-4 h-6 w-6 rounded-full border-2 opacity-70" />
      </div>

      {/* Animated floating dots */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <span
            key={i}
            className="bg-accentPrimary absolute h-1 w-1 rounded-full opacity-50"
          />
        ))}
      </div>
    </div>
  );
};

export default PageNotFound;
