import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1B0088 0%, #0B0033 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 240,
            color: 'white',
            fontFamily: 'sans-serif',
            fontWeight: 'bolder',
            letterSpacing: '-10px',
          }}
        >
          L
        </div>
      </div>
    ),
    { ...size }
  )
}
