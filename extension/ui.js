function byData(root, name) {
  return root.querySelector("[data-" + name + "]")
}

const ext = typeof chrome !== "undefined" ? chrome : browser

function setStatus(root, text, user, state) {
  const statusText = byData(root, "status-text")
  const statusUser = byData(root, "status-user")
  const indicator = byData(root, "status-indicator")
  if (statusText) statusText.textContent = text
  if (statusUser) statusUser.textContent = user || ""
  if (indicator) {
    indicator.className = "status-indicator " + (state || "")
  }
}

function setStatusMsg(el, text, type) {
  if (!el) return
  el.textContent = text
  el.className = "status-msg" + (type ? " " + type : "")
}

function toggleTab(root, tab) {
  root.querySelectorAll(".tab").forEach(function (button) {
    button.classList.toggle("active", button.dataset.tab === tab)
  })
  root.querySelectorAll(".panel").forEach(function (panel) {
    panel.classList.toggle("hidden", panel.dataset.panel !== tab)
  })
}

function sendMessage(message) {
  return new Promise(function (resolve) {
    ext.runtime.sendMessage(message, resolve)
  })
}

async function loadSession(root) {
  setStatus(root, "Checking session...", "", "loading")
  var response = await sendMessage({ type: "veridaq.session" })
  if (response && response.session && response.session.user) {
    var user = response.session.user
    setStatus(
      root,
      "Signed in",
      user.name + " · " + user.role,
      "online"
    )
    root.dataset.role = user.role
    // Load credits for employer role
    if (user.role === "EMPLOYER") {
      loadCredits(root)
    }
    return response.session
  }
  setStatus(root, "Not signed in", "Open the web app to sign in", "offline")
  root.dataset.role = ""
  return null
}

async function loadCredits(root) {
  var creditsCard = root.querySelector("[data-credits-card]")
  var creditFree = byData(root, "credit-free")
  var creditPaid = byData(root, "credit-paid")
  var creditTotal = byData(root, "credit-total")
  if (!creditsCard) return

  creditsCard.style.display = "flex"

  var res = await sendMessage({
    type: "veridaq.api",
    path: "/api/payment/info",
    options: { method: "GET" },
  })
  if (res && res.ok && res.data) {
    if (creditFree) creditFree.textContent = res.data.freeRemaining || 0
    if (creditPaid) creditPaid.textContent = res.data.credits || 0
    if (creditTotal) creditTotal.textContent = (res.data.totalAvailable || 0).toString()
  }
}

async function openCrossmintPurchase(root) {
  var creditStatus = byData(root, "credit-status")
  setStatusMsg(creditStatus, "Opening Crossmint...", "loading")

  var res = await sendMessage({
    type: "veridaq.api",
    path: "/api/crossmint/create-order",
    options: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amountUsd: 15,
        type: "EMPLOYER_TOPUP",
      }),
    },
  })
  var checkoutUrl = res && res.ok && res.data && (res.data.checkoutUrl || res.data.url)
  if (checkoutUrl) {
    setStatusMsg(creditStatus, "", "")
    ext.tabs.create({ url: checkoutUrl })
  } else {
    setStatusMsg(
      creditStatus,
      (res && res.data && res.data.error) || "Unable to create purchase URL",
      "error"
    )
  }
}

async function apiRequest(path, options) {
  return sendMessage({ type: "veridaq.api", path: path, options: options })
}

async function loadDashboard(root) {
  var list = byData(root, "dashboard-list")
  if (!list) return
  list.innerHTML = ""

  var role = root.dataset.role
  if (!role) {
    list.innerHTML = '<li><span class="list-secondary">Sign in to view activity</span></li>'
    return
  }

  if (role === "INSTITUTION") {
    var res = await sendMessage({
      type: "veridaq.api",
      path: "/api/institution/batch?limit=5&page=1",
      options: { method: "GET" },
    })
    if (!res || !res.ok) {
      list.innerHTML = '<li><span class="list-secondary">Unable to load batches</span></li>'
      return
    }
    var items = (res.data && res.data.items) || []
    if (items.length === 0) {
      list.innerHTML = '<li><span class="list-secondary">No batches yet</span></li>'
      return
    }
    items.forEach(function (item) {
      var li = document.createElement("li")
      li.innerHTML =
        '<span class="list-primary">' +
        (item.status || "UNKNOWN") +
        "</span> · " +
        (item.studentCount || 0) +
        " students"
      list.appendChild(li)
    })
  }

  if (role === "EMPLOYER") {
    // Show credit info in dashboard
    var creditRes = await sendMessage({
      type: "veridaq.api",
      path: "/api/payment/info",
      options: { method: "GET" },
    })
    if (creditRes && creditRes.ok && creditRes.data) {
      var d = creditRes.data
      var creditLi = document.createElement("li")
      creditLi.innerHTML =
        '<span class="list-primary">' +
        (d.totalAvailable || 0) +
        '</span> verifications available' +
        (d.freeRemaining > 0
          ? ' <span class="list-secondary">(' + d.freeRemaining + ' free)</span>'
          : "")
      list.appendChild(creditLi)
    }

    var res = await sendMessage({
      type: "veridaq.api",
      path: "/api/verify/history?page=1&limit=5",
      options: { method: "GET" },
    })
    if (!res || !res.ok) {
      list.innerHTML = '<li><span class="list-secondary">Unable to load requests</span></li>'
      return
    }
    var items = (res.data && res.data.items) || []
    if (items.length === 0) {
      list.innerHTML = '<li><span class="list-secondary">No verifications yet</span></li>'
      return
    }
    items.forEach(function (item) {
      var li = document.createElement("li")
      var result = item.result || item.status
      var cls = result === "VERIFIED" ? "list-primary" : "list-secondary"
      li.innerHTML = '<span class="' + cls + '">' + result + "</span>"
      list.appendChild(li)
    })
  }

  if (role === "ADMIN") {
    var res = await sendMessage({
      type: "veridaq.api",
      path: "/api/admin/stats",
      options: { method: "GET" },
    })
    if (!res || !res.ok) {
      list.innerHTML = '<li><span class="list-secondary">Unable to load stats</span></li>'
      return
    }
    var d = res.data
    list.innerHTML =
      '<li><span class="list-primary">' +
      (d.institutions || 0) +
      '</span> institutions</li>' +
      '<li><span class="list-primary">' +
      (d.employers || 0) +
      '</span> employers</li>' +
      '<li><span class="list-primary">' +
      (d.confirmedBatches || 0) +
      '</span> confirmed batches</li>' +
      '<li><span class="list-primary">' +
      (d.successfulVerifications || 0) +
      "</span> verifications</li>"
  }
}

function bindActions(root) {
  // Open full app
  root.querySelectorAll('[data-action="open-app"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      ext.tabs.create({ url: VERIDAQ_CONFIG.WEB_URL })
    })
  })

  // Logout
  root.querySelectorAll('[data-action="logout"]').forEach(function (btn) {
    btn.addEventListener("click", async function () {
      await sendMessage({ type: "veridaq.logout" })
      setStatus(root, "Not signed in", "Open the web app to sign in", "offline")
      root.dataset.role = ""
      // Hide credits card
      var creditsCard = root.querySelector("[data-credits-card]")
      if (creditsCard) creditsCard.style.display = "none"
      loadDashboard(root)
    })
  })

  // Refresh dashboard
  root.querySelectorAll('[data-action="refresh-dashboard"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      loadDashboard(root)
    })
  })

  // Tab switching
  root.querySelectorAll(".tab").forEach(function (button) {
    button.addEventListener("click", function () {
      toggleTab(root, button.dataset.tab)
    })
  })

  // Buy credits (Crossmint)
  root.querySelectorAll('[data-action="buy-credits"]').forEach(function (button) {
    button.addEventListener("click", function () {
      openCrossmintPurchase(root)
    })
  })

  // Upload
  var uploadFile = byData(root, "upload-file")
  var uploadStatus = byData(root, "upload-status")

  root.querySelectorAll('[data-action="upload"]').forEach(function (button) {
    button.addEventListener("click", async function () {
      if (!uploadFile || !uploadFile.files || uploadFile.files.length === 0) {
        setStatusMsg(uploadStatus, "Select a file first", "error")
        return
      }
      var formData = new FormData()
      formData.append("file", uploadFile.files[0])
      setStatusMsg(uploadStatus, "Uploading...", "loading")
      var res = await sendMessage({
        type: "veridaq.api",
        path: "/api/institution/batch/upload",
        options: { method: "POST", body: formData },
      })
      if (!res || !res.ok) {
        setStatusMsg(
          uploadStatus,
          (res && res.data && res.data.error) || "Upload failed",
          "error"
        )
        return
      }
      setStatusMsg(uploadStatus, "Upload accepted! Job: " + (res.data.jobId || "queued"), "success")
    })
  })

  // Verify
  var verifyInst = byData(root, "verify-inst")
  var verifyMatric = byData(root, "verify-matric")
  var verifyClaim = byData(root, "verify-claim")
  var verifyThreshold = byData(root, "verify-threshold")
  var verifyStatus = byData(root, "verify-status")

  root.querySelectorAll('[data-action="verify"]').forEach(function (button) {
    button.addEventListener("click", async function () {
      if (!verifyInst.value || !verifyMatric.value) {
        setStatusMsg(verifyStatus, "Institution ID and matric number required", "error")
        return
      }
      setStatusMsg(verifyStatus, "Submitting...", "loading")
      var payload = {
        institutionOnChainId: verifyInst.value,
        matricNumber: verifyMatric.value,
        claimType: Number(verifyClaim.value) || 1,
        threshold: Number(verifyThreshold.value) || 0,
      }
      var res = await sendMessage({
        type: "veridaq.api",
        path: "/api/verify/request",
        options: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      })
      if (!res || !res.ok) {
        setStatusMsg(
          verifyStatus,
          (res && res.data && res.data.error) || "Request failed",
          "error"
        )
        return
      }
      setStatusMsg(
        verifyStatus,
        "Request queued! ID: " + (res.data.requestId || "pending"),
        "success"
      )
    })
  })
}

async function init() {
  var root = document.querySelector(".app")
  if (!root) return
  await loadSession(root)
  bindActions(root)
  loadDashboard(root)
}

document.addEventListener("DOMContentLoaded", init)
