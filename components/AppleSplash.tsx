export default function AppleSplash() {
  // Most common iOS device dimensions for splash screens
  const splashSizes = [
    { w: 2048, h: 2732, mw: 1024, mh: 1366, r: 2 }, // iPad Pro 12.9"
    { w: 1668, h: 2388, mw: 834, mh: 1194, r: 2 },  // iPad Pro 11"
    { w: 1536, h: 2048, mw: 768, mh: 1024, r: 2 },  // iPad Mini, Air
    { w: 1125, h: 2436, mw: 375, mh: 812, r: 3 },   // iPhone X, XS, 11 Pro, 12 Mini, 13 Mini
    { w: 1242, h: 2688, mw: 414, mh: 896, r: 3 },   // iPhone XS Max, 11 Pro Max
    { w: 828, h: 1792, mw: 414, mh: 896, r: 2 },    // iPhone XR, 11
    { w: 1170, h: 2532, mw: 390, mh: 844, r: 3 },   // iPhone 12, 13, 14, 14 Pro
    { w: 1284, h: 2778, mw: 428, mh: 926, r: 3 },   // iPhone 12/13/14 Pro Max, 14 Plus
    { w: 1290, h: 2796, mw: 430, mh: 932, r: 3 },   // iPhone 14 Pro Max, 15 Pro Max, 15 Plus
    { w: 1179, h: 2556, mw: 393, mh: 852, r: 3 },   // iPhone 14 Pro, 15 Pro, 15
  ];

  return (
    <>
      {splashSizes.map((s, i) => (
        <link
          key={i}
          rel="apple-touch-startup-image"
          media={`(device-width: ${s.mw}px) and (device-height: ${s.mh}px) and (-webkit-device-pixel-ratio: ${s.r}) and (orientation: portrait)`}
          href={`/splash/${s.w}x${s.h}.png`}
        />
      ))}
      {splashSizes.map((s, i) => (
        <link
          key={`landscape-${i}`}
          rel="apple-touch-startup-image"
          media={`(device-width: ${s.mh}px) and (device-height: ${s.mw}px) and (-webkit-device-pixel-ratio: ${s.r}) and (orientation: landscape)`}
          href={`/splash/${s.h}x${s.w}.png`}
        />
      ))}
    </>
  );
}
