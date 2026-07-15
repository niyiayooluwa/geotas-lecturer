import authBg from "@/assets/image/auth.jpg";
import logoWhite from "@/assets/svgs/logo-white.svg";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full font-sans">
      {/* Left Pane - Branding & Graphic */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-900 flex-col justify-between overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${authBg})` }}
        />
        {/* Dark Overlay for Text Readability */}
        <div className="absolute inset-0 z-0 bg-black/60" />

        {/* Logo */}
        <div className="relative z-10 p-10 flex items-center gap-2">
          <img src={logoWhite} alt="GEOTAS Logo" className="h-8" />
        </div>

        {/* Center Content */}
        <div className="relative z-10 p-10 flex-1 flex flex-col justify-center max-w-lg">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 mb-6 backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-neutral-500" />
            <span className="text-xs font-medium text-white/90">
              Geo-Temporal Attendance System
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4 leading-tight">
            Attendance,
            <br />
            accounted for.
          </h1>
          <p className="text-lg text-white/70">
            Location-verified, QR-secured attendance for Nigerian universities.
          </p>
        </div>

        {/* Bottom Stats */}
        <div className="relative z-10 p-10 mt-auto">
          <div className="flex gap-10">
            <div>
              <p className="font-semibold text-white">4 layers</p>
              <p className="text-sm text-white/60">of verification</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="font-semibold text-white">Real-time</p>
              <p className="text-sm text-white/60">confidence scoring</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="font-semibold text-white">Tamper-proof</p>
              <p className="text-sm text-white/60">records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
