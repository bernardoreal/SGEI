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

  // Calculate proportional font size
  const minDim = Math.min(width, height);
  const fontSize = Math.floor(minDim * 0.4);

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1B0088 0%, #0B0033 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: fontSize,
            color: 'white',
            fontFamily: 'sans-serif',
            fontWeight: 'bolder',
            letterSpacing: '-10px',
            textShadow: '0 10px 20px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: fontSize * 1.5,
            height: fontSize * 1.5,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: fontSize * 0.4,
            boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.5)',
            marginBottom: fontSize * 0.3,
          }}
        >
          L
        </div>
        <div
          style={{
            fontSize: fontSize * 0.25,
            color: 'rgba(255,255,255,0.9)',
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            letterSpacing: '2px',
          }}
        >
          LATAM SGEI
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  );
}
