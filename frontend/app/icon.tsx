import { ImageResponse } from "next/og"

export const runtime = "edge"

export const size = {
  width: 32,
  height: 32,
}
export const contentType = "image/png"

export default async function Icon() {
  try {
    const logoUrl = new URL("../public/logo-white.png", import.meta.url)
    const logoData = await fetch(logoUrl).then((res) => res.arrayBuffer())

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#05050a",
            borderRadius: "6px",
          }}
        >
          {/* @ts-expect-error - ImageResponse img type */}
          <img src={logoData} width="28" height="28" alt="VERIDAQ" />
        </div>
      ),
      {
        ...size,
      }
    )
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#05050a",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#22d3ee",
            fontSize: "18px",
            fontWeight: "bold",
            fontFamily: "system-ui",
          }}
        >
          V
        </div>
      ),
      { ...size }
    )
  }
}
