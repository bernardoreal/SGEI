import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #002169 0%, #00123b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '128px',
          boxShadow: 'inset 0 0 0 10px rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            fontSize: 100,
            color: 'white',
            fontFamily: 'sans-serif',
            fontWeight: 900,
            letterSpacing: '5px',
            textShadow: '0 10px 20px rgba(0,0,0,0.5)',
          }}
        >
          LATAM
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 35,
            color: '#E60000', // LATAM Crimson
            fontFamily: 'sans-serif',
            fontWeight: 800,
            letterSpacing: '10px',
            textShadow: '0 5px 10px rgba(0,0,0,0.5)',
            textTransform: 'uppercase'
          }}
        >
          Cargo
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '24px',
            backgroundColor: '#E60000',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
