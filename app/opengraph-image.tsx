import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "Blockchain Indexing Status Dashboard"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function OGImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom, #0B1120, #0a0f1c)",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            background: "linear-gradient(to bottom right, #0ea5e9, #8b5cf6)",
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 32,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              background: "linear-gradient(to right, #0ea5e9, #8b5cf6)",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
              padding: 0,
            }}
          >
            Blockchain
          </h1>
          <h2
            style={{
              fontSize: 64,
              fontWeight: 700,
              background: "linear-gradient(to right, #0ea5e9, #8b5cf6)",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
              padding: 0,
            }}
          >
            Indexing Status
          </h2>
        </div>
      </div>
      <p
        style={{
          fontSize: 28,
          color: "#94a3b8",
          maxWidth: 800,
          textAlign: "center",
        }}
      >
        Real-time monitoring of blockchain indexing progress for ERC20 tokens and Master Copies
      </p>
    </div>,
    {
      ...size,
    },
  )
}

