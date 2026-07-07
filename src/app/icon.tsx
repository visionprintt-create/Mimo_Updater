import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            color: '#38bdf8', // Bright Sky Blue
            fontSize: '420px',
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            transform: 'translateY(-35px)',
          }}
        >
          M
        </div>
        <div
          style={{
            position: 'absolute',
            color: '#f472b6', // Bright Pink
            fontSize: '420px',
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            transform: 'translateY(35px)',
            opacity: 0.85,
          }}
        >
          W
        </div>
      </div>
    ),
    { ...size }
  );
}
