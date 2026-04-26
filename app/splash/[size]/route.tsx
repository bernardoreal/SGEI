import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const size = (await params).size.replace('.png', '');
  const [widthStr, heightStr] = size.split('x');
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);

  if (!width || !height || width > 4000 || height > 4000) {
    return new Response('Invalid size', { status: 400 });
  }

  // Calculate proportional units
  const minDim = Math.min(width, height);
  const scale = minDim / 1000;

  return new ImageResponse(
    (
      <div
        style={{
          // LATAM Indigo professional gradient
          background: 'radial-gradient(circle at 50% 30%, #002169 0%, #050c1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ambient top light */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '40%',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(230, 0, 0, 0.15) 0%, rgba(0,0,0,0) 70%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20 * scale,
          }}
        >
          {/* Logo Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 250 * scale,
              height: 250 * scale,
              background: '#002169',
              borderRadius: 30 * scale,
              boxShadow: `0 ${30 * scale}px ${60 * scale}px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.2), inset 0 -5px 15px rgba(0,0,0,0.4), 0 0 0 ${4 * scale}px rgba(255,255,255,0.05)`,
            }}
          >
            <div
              style={{
                fontSize: 60 * scale,
                color: '#ffffff',
                fontFamily: 'sans-serif',
                fontWeight: 900,
                letterSpacing: 2 * scale,
              }}
            >
              LATAM
            </div>
          </div>

          {/* Subtitle / Product Name */}
          <div
            style={{
              marginTop: 40 * scale,
              display: 'flex',
              alignItems: 'baseline',
              gap: 15 * scale,
            }}
          >
            <span
              style={{
                fontSize: 50 * scale,
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'sans-serif',
                letterSpacing: -1 * scale,
              }}
            >
              LATAM
            </span>
            <span
              style={{
                fontSize: 50 * scale,
                fontWeight: 800,
                color: '#E60000', // LATAM Crimson
                fontFamily: 'sans-serif',
                letterSpacing: -1 * scale,
              }}
            >
              SGEI
            </span>
          </div>

          <div
            style={{
              fontSize: 24 * scale,
              fontWeight: 600,
              color: '#8f9bb3',
              fontFamily: 'sans-serif',
              letterSpacing: 8 * scale,
              textTransform: 'uppercase',
              marginTop: 10 * scale,
            }}
          >
            Cargo Operations
          </div>
        </div>

        {/* Bottom bar indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 60 * scale,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <div
            style={{
              width: 150 * scale,
              height: 6 * scale,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 3 * scale,
            }}
          />
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  );
}
