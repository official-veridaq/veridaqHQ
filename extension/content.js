const PANEL_ID = "veridaq-panel"
const BUTTON_ID = "veridaq-fab"
const ext = typeof chrome !== "undefined" ? chrome : browser

function createFab() {
  const button = document.createElement("button")
  button.id = BUTTON_ID
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  `
  button.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:20px",
    "z-index:2147483647",
    "width:40px",
    "height:40px",
    "border-radius:10px",
    "border:1px solid #1c1c2a",
    "background:#111119",
    "color:#22d3ee",
    "cursor:pointer",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 4px 20px rgba(0,0,0,0.4)",
    "transition:all 0.2s",
  ].join(";")

  button.addEventListener("mouseenter", function () {
    button.style.background = "#16161f"
    button.style.borderColor = "rgba(34,211,238,0.3)"
    button.style.boxShadow = "0 4px 24px rgba(0,0,0,0.5), 0 0 20px rgba(34,211,238,0.1)"
  })

  button.addEventListener("mouseleave", function () {
    button.style.background = "#111119"
    button.style.borderColor = "#1c1c2a"
    button.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)"
  })

  button.addEventListener("click", togglePanel)
  return button
}

function togglePanel() {
  const existing = document.getElementById(PANEL_ID)
  if (existing) {
    existing.style.opacity = "0"
    existing.style.transform = "translateY(8px) scale(0.98)"
    setTimeout(function () { existing.remove() }, 150)
    return
  }

  const wrapper = document.createElement("div")
  wrapper.id = PANEL_ID
  wrapper.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:72px",
    "width:360px",
    "height:520px",
    "z-index:2147483647",
    "border-radius:12px",
    "overflow:hidden",
    "box-shadow:0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px #1c1c2a",
    "opacity:0",
    "transform:translateY(8px) scale(0.98)",
    "transition:all 0.2s cubic-bezier(0.16,1,0.3,1)",
  ].join(";")

  const iframe = document.createElement("iframe")
  iframe.src = ext.runtime.getURL("panel.html")
  iframe.style.cssText = "width:100%;height:100%;border:none;"
  wrapper.appendChild(iframe)

  document.body.appendChild(wrapper)

  // Animate in
  requestAnimationFrame(function () {
    wrapper.style.opacity = "1"
    wrapper.style.transform = "translateY(0) scale(1)"
  })

  window.addEventListener("message", function handler(event) {
    if (event.data && event.data.type === "veridaq.close") {
      wrapper.style.opacity = "0"
      wrapper.style.transform = "translateY(8px) scale(0.98)"
      setTimeout(function () { wrapper.remove() }, 150)
      window.removeEventListener("message", handler)
    }
  })
}

if (!document.getElementById(BUTTON_ID)) {
  document.body.appendChild(createFab())
}
