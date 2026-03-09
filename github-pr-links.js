// ==UserScript==
// @name         GitHub PR Copy Title Link
// @namespace    http://tampermonkey.net/
// @version      1.2.8
// @description  Adds buttons to copy PR title as Markdown or rich text link
// @match        https://github.com/*/*/pull/*
// @updateURL    https://raw.githubusercontent.com/adrian-scehura/tampermonkey-scripts/main/github-pr-links.js
// @downloadURL  https://raw.githubusercontent.com/adrian-scehura/tampermonkey-scripts/main/github-pr-links.js
// @grant        GM_setClipboard
// ==/UserScript==

(() => {
  "use strict";

  const BTN_MD_ID = "tm-copy-pr-link-md-btn";
  const BTN_RICH_ID = "tm-copy-pr-link-rich-btn";
  const BTN_WRAP_ID = "tm-copy-pr-link-btn-wrap";

  const getPrUrl = () => {
    const match = location.pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/);
    return location.origin + (match ? match[0] : location.pathname);
  };

  const getRepoName = () => {
    const parts = location.pathname.split("/");
    return decodeURIComponent(parts[2] || "").trim();
  };

  const getTitle = () => {
    const h1 = document.querySelector('[data-component="PH_Title"]');
    const titleNode = h1?.cloneNode(true);
    titleNode?.querySelectorAll("button").forEach((button) => button.remove());

    return (titleNode?.textContent || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\s*(?:\(#\d+\)|#\d+)\s*$/, "");
  };

  const getLinkText = () => {
    const repo = getRepoName();
    const title = getTitle();
    return repo ? `[${repo}] ${title}` : title;
  };

  const escapeHtml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const escapeMarkdownLinkText = (value) =>
    value
      .replaceAll("\\", "\\\\")
      .replaceAll("[", "\\[")
      .replaceAll("]", "\\]");

  const setCopiedState = (button, originalText) => {
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  };

  const copyPlain = async (text) => {
    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(text, "text");
      return;
    }
    await navigator.clipboard.writeText(text);
  };

  const copyRich = async (plainText, htmlText) => {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([htmlText], { type: "text/html" }),
      });
      await navigator.clipboard.write([item]);
      return;
    }

    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(htmlText, "html");
      return;
    }

    await navigator.clipboard.writeText(plainText);
  };

  const styleTitleParent = (parent) => {
    parent.style.display = "flex";
    parent.style.flexDirection = "row-reverse";
    parent.style.alignItems = "center";
    parent.style.gap = "8px";
  };

  function addButtons() {
    const h1 = document.querySelector('[data-component="PH_Title"]');
    const parent = h1?.parentElement;
    if (!h1 || !parent) return;

    document.getElementById(BTN_WRAP_ID)?.remove();
    styleTitleParent(parent);

    const wrap = document.createElement("span");
    wrap.id = BTN_WRAP_ID;
    wrap.style.display = "inline-flex";
    wrap.style.gap = "6px";
    wrap.style.flexShrink = "0";

    const mdBtn = document.createElement("button");
    mdBtn.id = BTN_MD_ID;
    mdBtn.type = "button";
    mdBtn.className = "btn btn-sm";
    mdBtn.textContent = "Copy MD link";

    const richBtn = document.createElement("button");
    richBtn.id = BTN_RICH_ID;
    richBtn.type = "button";
    richBtn.className = "btn btn-sm";
    richBtn.textContent = "Copy rich link";

    mdBtn.onclick = async () => {
      const url = getPrUrl();
      const linkText = getLinkText();
      const markdown = `[${escapeMarkdownLinkText(linkText)}](${url})`;
      await copyPlain(markdown);
      setCopiedState(mdBtn, "Copy MD link");
    };

    richBtn.onclick = async () => {
      const url = getPrUrl();
      const linkText = getLinkText();
      const plain = `${linkText} ${url}`;
      const html = `<a href="${escapeHtml(url)}">${escapeHtml(linkText)}</a>`;
      await copyRich(plain, html);
      setCopiedState(richBtn, "Copy rich link");
    };

    wrap.append(mdBtn, richBtn);
    parent.prepend(wrap);
  }

  addButtons();
  window.addEventListener("turbo:load", addButtons);
  window.addEventListener("turbo:render", addButtons);
})();
