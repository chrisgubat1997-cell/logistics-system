/* =========================================================
   LOGIS-TECH MAIL — FUNCTIONAL MESSAGING
   VERSION: 20261109-03
========================================================= */
(function () {
  "use strict";

  const API_URL = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
  const POLL_MS = 12000;
  let state = {
    user: null, users: [], threads: [], selectedThreadId: "",
    messages: [], filter: "ALL", search: "", composeOpen: false,
    composeQuery: "", loading: false, poller: null, sending: false
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const escapeHTML = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
  const initials = value => String(value || "?").trim().split(/\s+/).slice(0,2).map(x => x.charAt(0)).join("").toUpperCase();
  const accountData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("logitechUser") || "{}");
      return saved.account || saved.user || saved;
    } catch (e) { return {}; }
  };
  const api = async (action, data) => {
    const user = state.user || accountData();
    if (!user.sessionToken) throw new Error("Your login session is missing. Please log out and log in again.");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, data: Object.assign({}, data || {}, { sessionToken: user.sessionToken }) })
    });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch (e) { throw new Error("Invalid response from Messaging API."); }
    if (!response.ok || !result || result.success === false) {
      throw new Error((result && (result.error || result.message)) || ("HTTP " + response.status));
    }
    return result;
  };
  const dateLabel = value => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    return date.toDateString() === now.toDateString()
      ? date.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})
      : date.toLocaleDateString([], {month:"short", day:"numeric"});
  };
  const fullDate = value => {
    if (!value) return "";
    const date = new Date(value);
    return isNaN(date.getTime()) ? "" : date.toLocaleString([], {month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit"});
  };
  const isUnread = thread => {
    if (!thread.lastMessageAt || !thread.lastReadAt) return !!thread.lastMessageAt && thread.lastMessageBy !== (state.user.fullName || state.user.username);
    return new Date(thread.lastMessageAt).getTime() > new Date(thread.lastReadAt).getTime()
      && thread.lastMessageBy !== (state.user.fullName || state.user.username)
      && thread.lastMessageBy !== state.user.username;
  };
  const getSelected = () => state.threads.find(t => t.threadId === state.selectedThreadId);

  function ensureMarkup() {
    const root = $("#messages");
    if (!root || $(".messages-app", root)) return;
    root.innerHTML = `
      <div class="messages-app">
        <header class="mail-header">
          <div><div class="mail-eyebrow">LOGIS-TECH SYSTEM</div><h1>Messages</h1><p>Team conversations and private messages in one place.</p></div>
          <button class="mail-primary" id="mailCompose"><span>＋</span> New message</button>
        </header>
        <div class="mail-shell">
          <aside class="mail-sidebar">
            <button class="mail-compose-wide" id="mailComposeSide">＋ &nbsp; Compose</button>
            <div class="mail-nav-caption">MAILBOX</div>
            <button class="mail-nav active" data-filter="ALL"><span>▣</span> All conversations <b id="mailAllCount">0</b></button>
            <button class="mail-nav" data-filter="SO"><span>▤</span> Sales Order threads</button>
            <button class="mail-nav" data-filter="PRIVATE"><span>✉</span> Private messages</button>
            <div class="mail-sidebar-note"><span class="mail-status-dot"></span> Connected to LOGIS-TECH database</div>
          </aside>
          <section class="mail-main">
            <div class="mail-toolbar">
              <label class="mail-search"><span>⌕</span><input id="mailThreadSearch" type="search" placeholder="Search SO number, project, or conversation..." autocomplete="off"></label>
              <button class="mail-icon-btn" id="mailRefresh" title="Refresh conversations" aria-label="Refresh">↻</button>
            </div>
            <div class="mail-columns">
              <section class="mail-list-panel">
                <div class="mail-list-heading"><div><h2 id="mailListTitle">All conversations</h2><p id="mailListSubtitle">Your latest messages</p></div><span id="mailThreadCount">0</span></div>
                <div id="mailThreadList" class="mail-thread-list"><div class="mail-loading">Loading conversations…</div></div>
              </section>
              <section class="mail-chat-panel" id="mailChatPanel">
                <div class="mail-empty"><div class="mail-empty-icon">✉</div><h3>Your conversations</h3><p>Select a conversation from the list, or start a private message with a colleague.</p><button class="mail-primary" id="mailEmptyCompose">＋ New private message</button></div>
              </section>
            </div>
          </section>
        </div>
        <div class="mail-compose-overlay" id="mailComposeOverlay" hidden>
          <div class="mail-compose-card" role="dialog" aria-modal="true" aria-labelledby="mailComposeTitle">
            <div class="mail-compose-head"><div><h2 id="mailComposeTitle">New private message</h2><p>Find a registered user by name, username, or email.</p></div><button class="mail-close" id="mailComposeClose" aria-label="Close">×</button></div>
            <label class="mail-recipient-search"><span>⌕</span><input id="mailUserSearch" type="search" placeholder="Search name, username, or email…" autocomplete="off"></label>
            <div class="mail-user-hint">ACTIVE REGISTERED USERS</div>
            <div id="mailUserResults" class="mail-user-results"><div class="mail-user-empty">Start typing to find a colleague.</div></div>
          </div>
        </div>
        <div class="mail-toast" id="mailToast" role="status" aria-live="polite"></div>
      </div>`;
    bindEvents();
  }

  function bindEvents() {
    $("#mailCompose").addEventListener("click", openCompose);
    $("#mailComposeSide").addEventListener("click", openCompose);
    $("#mailEmptyCompose").addEventListener("click", openCompose);
    $("#mailComposeClose").addEventListener("click", closeCompose);
    $("#mailComposeOverlay").addEventListener("click", e => { if (e.target.id === "mailComposeOverlay") closeCompose(); });
    $("#mailUserSearch").addEventListener("input", e => { state.composeQuery = e.target.value; renderUserSuggestions(); });
    $("#mailThreadSearch").addEventListener("input", e => { state.search = e.target.value; renderThreads(); });
    $("#mailRefresh").addEventListener("click", () => refreshData(true));
    document.querySelectorAll(".mail-nav").forEach(button => button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll(".mail-nav").forEach(item => item.classList.toggle("active", item === button));
      renderThreads();
    }));
    $("#mailChatPanel").addEventListener("submit", async e => {
      if (e.target.id !== "mailSendForm") return;
      e.preventDefault();
      await sendMessage();
    });
    $("#mailChatPanel").addEventListener("keydown", e => {
      if (e.target.id === "mailMessageInput" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    $("#mailThreadList").addEventListener("click", e => {
      const row = e.target.closest("[data-thread-id]");
      if (row) openThread(row.dataset.threadId);
    });
  }

  function openCompose() {
    state.composeOpen = true;
    $("#mailComposeOverlay").hidden = false;
    $("#mailUserSearch").value = "";
    state.composeQuery = "";
    renderUserSuggestions();
    setTimeout(() => $("#mailUserSearch").focus(), 30);
  }
  function closeCompose() {
    state.composeOpen = false;
    $("#mailComposeOverlay").hidden = true;
  }
  function showToast(message, isError) {
    const toast = $("#mailToast");
    toast.textContent = message;
    toast.classList.toggle("error", !!isError);
    toast.classList.add("visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  async function initializeMessages() {
    ensureMarkup();
    state.user = accountData();
    if (!state.user.sessionToken) {
      showToast("Login session missing. Please log out and log in again.", true);
      return;
    }
    try {
      await Promise.all([loadUsers(), refreshData(false)]);
      if (state.poller) clearInterval(state.poller);
      state.poller = setInterval(() => {
        const page = $("#messages");
        if (page && page.classList.contains("active")) refreshData(false);
      }, POLL_MS);
    } catch (error) {
      showToast(error.message, true);
      $("#mailThreadList").innerHTML = '<div class="mail-error">' + escapeHTML(error.message) + '</div>';
    }
  }

  async function loadUsers() {
    const result = await api("getMessagingUsers");
    state.users = result.users || [];
  }
  async function refreshData(showNotice) {
    try {
      const result = await api("getMessagingThreads");
      state.threads = result.threads || [];
      renderThreads();
      if (state.selectedThreadId) {
        const stillExists = state.threads.some(t => t.threadId === state.selectedThreadId);
        if (stillExists) await loadMessages(state.selectedThreadId, false);
        else { state.selectedThreadId = ""; state.messages = []; renderChat(); }
      } else {
        renderChat();
      }
      if (showNotice) showToast("Conversations refreshed.");
    } catch (error) {
      if (showNotice) showToast(error.message, true);
      else console.warn("Messaging refresh failed:", error);
    }
  }

  function renderThreads() {
    const list = $("#mailThreadList");
    if (!list) return;
    const q = state.search.trim().toLowerCase();
    const filtered = state.threads.filter(thread => {
      const type = String(thread.threadType || (thread.soNumber ? "SO" : "PRIVATE")).toUpperCase();
      if (state.filter !== "ALL" && type !== state.filter) return false;
      const counterpart = thread.counterpart || {};
      const text = [thread.subject, thread.soNumber, thread.clientName, thread.project, thread.lastMessagePreview,
        counterpart.fullName, counterpart.username, counterpart.email].join(" ").toLowerCase();
      return !q || text.includes(q);
    });
    $("#mailThreadCount").textContent = String(filtered.length);
    $("#mailAllCount").textContent = String(state.threads.length);
    $("#mailListTitle").textContent = state.filter === "SO" ? "Sales Order conversations" : state.filter === "PRIVATE" ? "Private messages" : "All conversations";
    $("#mailListSubtitle").textContent = filtered.length + " conversation" + (filtered.length === 1 ? "" : "s");
    if (!filtered.length) {
      list.innerHTML = '<div class="mail-list-empty"><div>✉</div><strong>No conversations found</strong><span>Start a private message or wait for an SO conversation.</span></div>';
      return;
    }
    list.innerHTML = filtered.map(thread => {
      const type = String(thread.threadType || (thread.soNumber ? "SO" : "PRIVATE")).toUpperCase();
      const counterpart = thread.counterpart || {};
      const title = type === "PRIVATE" ? (counterpart.fullName || counterpart.username || thread.subject || "Private conversation") : (thread.soNumber ? "SO " + thread.soNumber : thread.subject || "Sales Order conversation");
      const subtitle = type === "PRIVATE" ? (counterpart.email || ("@" + (counterpart.username || ""))) : [thread.clientName, thread.project].filter(Boolean).join(" · ");
      const preview = thread.lastMessagePreview || "No messages yet — start the conversation";
      const unread = isUnread(thread);
      return '<button type="button" class="mail-thread-row ' + (thread.threadId === state.selectedThreadId ? "selected " : "") + (unread ? "unread" : "") + '" data-thread-id="' + escapeHTML(thread.threadId) + '">' +
        '<span class="mail-avatar">' + escapeHTML(initials(type === "PRIVATE" ? title : (thread.clientName || "SO"))) + '</span>' +
        '<span class="mail-thread-copy"><span class="mail-thread-top"><strong>' + escapeHTML(title) + '</strong><time>' + escapeHTML(dateLabel(thread.lastMessageAt || thread.createdAt)) + '</time></span>' +
        '<span class="mail-thread-subject">' + escapeHTML(type === "PRIVATE" ? "Private message" : (thread.subject || subtitle || "Sales Order")) + '</span>' +
        '<span class="mail-thread-preview">' + escapeHTML(preview) + '</span><span class="mail-thread-meta"><i class="' + (type === "PRIVATE" ? "private" : "so") + '">' + (type === "PRIVATE" ? "PRIVATE" : "SALES ORDER") + '</i>' + escapeHTML(type === "PRIVATE" ? (counterpart.role || "") : (thread.project || "")) + '</span></span>' +
        (unread ? '<span class="mail-unread-dot"></span>' : '') + '</button>';
    }).join("");
  }

  async function openThread(threadId) {
    state.selectedThreadId = threadId;
    renderThreads();
    await loadMessages(threadId, true);
  }
  async function loadMessages(threadId, markRead) {
    const currentInput = $("#mailMessageInput");
    const draft = currentInput ? currentInput.value : "";
    const result = await api("getMessagingMessages", { threadId, limit: 100 });
    state.messages = result.messages || [];
    renderChat();
    const refreshedInput = $("#mailMessageInput");
    if (refreshedInput && !markRead) refreshedInput.value = draft;
    if (markRead) {
      await api("markMessagingThreadRead", { threadId });
      const thread = getSelected();
      if (thread) thread.lastReadAt = new Date().toISOString();
      renderThreads();
    }
  }

  function renderChat() {
    const panel = $("#mailChatPanel");
    if (!panel) return;
    const thread = getSelected();
    if (!thread) {
      panel.innerHTML = '<div class="mail-empty"><div class="mail-empty-icon">✉</div><h3>Your conversations</h3><p>Select a conversation from the list, or start a private message with a colleague.</p><button class="mail-primary" id="mailEmptyCompose">＋ New private message</button></div>';
      $("#mailEmptyCompose").addEventListener("click", openCompose);
      return;
    }
    const type = String(thread.threadType || (thread.soNumber ? "SO" : "PRIVATE")).toUpperCase();
    const counterpart = thread.counterpart || {};
    const title = type === "PRIVATE" ? (counterpart.fullName || counterpart.username || "Private conversation") : ("SO " + (thread.soNumber || ""));
    const subtitle = type === "PRIVATE" ? [counterpart.username ? "@" + counterpart.username : "", counterpart.email || "", counterpart.role || ""].filter(Boolean).join(" · ") : [thread.clientName, thread.project].filter(Boolean).join(" · ");
    const messagesHTML = state.messages.length ? state.messages.map(message => {
      const mine = String(message.senderUserId) === String(state.user.userId);
      return '<div class="mail-message ' + (mine ? "mine" : "theirs") + '"><div class="mail-message-name">' + (mine ? "You" : escapeHTML(message.senderFullName || message.senderUsername || "User")) + '</div><div class="mail-bubble">' + escapeHTML(message.messageBody || "").replace(/\n/g, "<br>") + '</div><time>' + escapeHTML(fullDate(message.sentAt)) + '</time></div>';
    }).join("") : '<div class="mail-no-messages"><span>✉</span><strong>No messages yet</strong><small>Send the first message in this conversation.</small></div>';
    panel.innerHTML = '<div class="mail-chat-head"><span class="mail-avatar large">' + escapeHTML(initials(title)) + '</span><div class="mail-chat-title"><h2>' + escapeHTML(title) + '</h2><p>' + escapeHTML(subtitle || (type === "SO" ? "Shared Sales Order conversation" : "Private conversation")) + '</p></div><span class="mail-chat-type ' + (type === "PRIVATE" ? "private" : "so") + '">' + (type === "PRIVATE" ? "PRIVATE" : "SO THREAD") + '</span></div>' +
      (type === "SO" ? '<div class="mail-so-context"><strong>' + escapeHTML(thread.subject || title) + '</strong><span>' + escapeHTML([thread.clientName, thread.project].filter(Boolean).join(" · ")) + '</span></div>' : '') +
      '<div class="mail-message-history" id="mailMessageHistory">' + messagesHTML + '</div>' +
      '<form class="mail-send-form" id="mailSendForm"><textarea id="mailMessageInput" maxlength="5000" rows="2" placeholder="Write a message… (Enter to send, Shift + Enter for new line)" required></textarea><div class="mail-send-footer"><small>Messages are stored in the LOGIS-TECH database.</small><button class="mail-primary" type="submit" ' + (state.sending ? "disabled" : "") + '><span>➤</span> Send</button></div></form>';
    const history = $("#mailMessageHistory");
    history.scrollTop = history.scrollHeight;
  }

  async function sendMessage() {
    if (state.sending) return;
    const input = $("#mailMessageInput");
    const body = input ? input.value.trim() : "";
    if (!body || !state.selectedThreadId) return;
    state.sending = true;
    const button = $("#mailSendForm button");
    if (button) button.disabled = true;
    try {
      await api("sendMessagingMessage", { threadId: state.selectedThreadId, messageBody: body });
      await loadMessages(state.selectedThreadId, true);
      await refreshData(false);
      showToast("Message sent.");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      state.sending = false;
      const current = $("#mailMessageInput");
      if (current) current.focus();
      const sendButton = $("#mailSendForm button");
      if (sendButton) sendButton.disabled = false;
    }
  }

  function renderUserSuggestions() {
    const box = $("#mailUserResults");
    if (!box) return;
    const query = state.composeQuery.trim().toLowerCase();
    if (!query) {
      box.innerHTML = '<div class="mail-user-empty">Type at least 2 characters to search active users.</div>';
      return;
    }
    if (query.length < 2) {
      box.innerHTML = '<div class="mail-user-empty">Type one more character…</div>';
      return;
    }
    const matches = state.users.filter(user => [user.fullName, user.username, user.email, user.role].join(" ").toLowerCase().includes(query)).slice(0, 20);
    if (!matches.length) {
      box.innerHTML = '<div class="mail-user-empty">No active user matched your search.</div>';
      return;
    }
    box.innerHTML = matches.map(user => '<button class="mail-user-result" type="button" data-user-id="' + escapeHTML(user.userId) + '"><span class="mail-avatar">' + escapeHTML(initials(user.fullName || user.username)) + '</span><span><strong>' + escapeHTML(user.fullName || user.username) + '</strong><small>@' + escapeHTML(user.username) + ' · ' + escapeHTML(user.email) + '</small></span><i>' + escapeHTML(user.role) + '</i><b>›</b></button>').join("");
    box.querySelectorAll("[data-user-id]").forEach(button => button.addEventListener("click", () => startPrivateChat(button.dataset.userId)));
  }

  async function startPrivateChat(userId) {
    try {
      const result = await api("createPrivateMessageThread", { recipientUserId: userId });
      closeCompose();
      await refreshData(false);
      await openThread(result.threadId);
      showToast(result.existing ? "Private conversation opened." : "Private conversation created.");
    } catch (error) { showToast(error.message, true); }
  }

  window.initializeMessages = initializeMessages;
  window.stopMessagesPolling = function () { if (state.poller) clearInterval(state.poller); state.poller = null; };
})();
