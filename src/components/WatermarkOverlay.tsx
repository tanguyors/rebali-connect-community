export default function WatermarkOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-[-50%] w-[200%] h-[200%]"
        style={{
          transform: 'rotate(-30deg)',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: 'center',
          gap: '24px 48px',
        }}
      >
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            className="text-white/20 text-[13px] font-bold whitespace-nowrap"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            Re-Bali.com
          </span>
        ))}
      </div>
    </div>
  );
}
