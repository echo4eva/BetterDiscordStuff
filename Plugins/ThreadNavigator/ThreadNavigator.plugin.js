/**
 * @name ThreadNavigator
 * @author echo4eva
 * @description A persistent thread list beside Discord channels with a full chat-area browser.
 * @version 0.1.0
 * @source https://github.com/echo4eva/BetterDiscordStuff/blob/master/src/ThreadNavigator/index.jsx
 */
/*@cc_on
@if (@_jscript)

	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/
const CHANGES = {
	"0.1.0": {
		added: ["thread sidebar and full browser for Discord"],
	},
};
// src/ThreadNavigator/index.jsx
var api = new BdApi("ThreadNavigator");
var { Webpack, DOM, Data, UI } = api;
var ChannelStore = Webpack.getStore("ChannelStore");
var ActiveThreadsStore = Webpack.getStore("ActiveJoinedThreadsStore");
var ReadStateStore = Webpack.getStore("ReadStateStore");
var transitionTo = Webpack.getByStrings("transitionTo - Transitioning to ", {
	searchExports: true,
});
var css = `
.tn-rail { display: flex; flex-direction: column; min-width: 0; }
.tn-rail.tn-threads-active { width: 280px !important; min-width: 280px !important; }
.tn-rail.tn-threads-active > aside[class*="membersWrap"] { display: none !important; }
.tn-rail > aside[class*="membersWrap"] { flex: 1; min-height: 0; }
.tn-root { display: flex; flex-direction: column; flex: 0 0 auto; min-height: 0; color: var(--text-default); background: var(--background-base-low); border-left: 1px solid var(--border-subtle); }
.tn-rail.tn-threads-active .tn-root { flex: 1; }
.tn-tabs { display: flex; align-items: center; gap: 2px; padding: 8px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
.tn-tab, .tn-expand, .tn-browser-close, .tn-tab-action { border: 0; border-radius: 6px; color: var(--text-muted); background: transparent; cursor: pointer; font: inherit; }
.tn-tab { flex: 1; padding: 7px 4px; font-size: 12px; font-weight: 700; }
.tn-tab[aria-selected="true"] { color: var(--text-default); background: var(--background-modifier-selected); }
.tn-tab:hover, .tn-expand:hover, .tn-browser-close:hover, .tn-tab-action:hover { color: var(--text-default); background: var(--background-modifier-hover); }
.tn-expand { width: 28px; height: 28px; font-size: 18px; line-height: 1; }
.tn-sidebody { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.tn-root[data-mode="members"] .tn-sidebody { display: none; }
.tn-search-wrap { padding: 10px 10px 6px; flex-shrink: 0; }
.tn-search { width: 100%; box-sizing: border-box; border: 0; outline: 0; border-radius: 6px; padding: 8px 10px; color: var(--text-default); background: var(--background-base-lower); font: inherit; font-size: 13px; }
.tn-list { overflow-y: auto; min-height: 0; flex: 1; padding: 4px 8px 12px; }
.tn-item { display: flex; align-items: flex-start; gap: 4px; padding: 8px; margin: 2px 0; border-radius: 7px; color: var(--text-default); }
.tn-item:hover { background: var(--background-modifier-hover); }
.tn-item-link { display: block; min-width: 0; flex: 1; color: inherit; text-decoration: none; }
.tn-item-main { min-width: 0; flex: 1; }
.tn-item-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
.tn-item-meta { display: block; margin-top: 4px; color: var(--text-muted); font-size: 11px; }
.tn-item-unread .tn-item-name::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin: 0 6px 1px 0; background: var(--brand-500); }
.tn-tab-action { flex-shrink: 0; width: 24px; height: 24px; font-size: 17px; line-height: 1; }
.tn-empty { padding: 22px 12px; color: var(--text-muted); text-align: center; font-size: 13px; line-height: 1.4; }
.tn-empty button, .tn-browser-action { margin-top: 12px; border: 0; border-radius: 6px; background: var(--button-secondary-background); color: var(--button-secondary-text); padding: 8px 10px; cursor: pointer; font: inherit; }
.tn-header-button { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin: 0 2px; border: 0; border-radius: 7px; color: var(--interactive-normal); background: transparent; cursor: pointer; }
.tn-header-button:hover, .tn-header-button[aria-pressed="true"] { color: var(--interactive-active); background: var(--background-modifier-hover); }
.tn-header-button svg { width: 20px; height: 20px; }
.tn-full-active > main[class*="chatContent"] { display: none !important; }
.tn-browser { display: none; flex: 1; flex-direction: column; min-width: 0; min-height: 0; color: var(--text-default); background: var(--background-base-low); }
.tn-full-active > .tn-browser { display: flex; }
.tn-browser-bar { display: flex; align-items: center; gap: 10px; padding: 16px 20px 8px; flex-shrink: 0; }
.tn-browser-title { min-width: 0; flex: 1; font-size: 20px; font-weight: 700; }
.tn-browser-close { width: 30px; height: 30px; font-size: 22px; line-height: 1; }
.tn-browser-controls { display: flex; gap: 8px; padding: 4px 20px 12px; flex-shrink: 0; }
.tn-browser-controls .tn-search { flex: 1; }
.tn-filter { border: 0; border-radius: 6px; padding: 6px 10px; background: var(--background-base-lower); color: var(--text-default); font: inherit; }
.tn-browser-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); align-content: start; gap: 8px; overflow-y: auto; padding: 4px 20px 24px; }
.tn-browser-grid .tn-item { min-height: 74px; padding: 12px; border: 1px solid var(--border-subtle); background: var(--background-base-lower); }
.tn-browser-grid .tn-item:hover { background: var(--background-modifier-hover); }
.tn-browser-grid .tn-item-name { white-space: normal; overflow-wrap: anywhere; }
.tn-load { grid-column: 1 / -1; padding: 12px; color: var(--text-muted); text-align: center; font-size: 12px; }
`;
function node(tag, className, text) {
	const element = document.createElement(tag);
	if (className) element.className = className;
	if (text !== void 0) element.textContent = text;
	return element;
}
function storeThreads(store, method, ...args) {
	try {
		return store?.[method]?.(...args) ?? [];
	} catch {
		return [];
	}
}
module.exports = class ThreadNavigator {
	constructor(meta) {
		this.meta = meta;
		this.sync = this.sync.bind(this);
		this.scheduleSync = this.scheduleSync.bind(this);
	}
	start() {
		this.settings = Object.assign(
			{ startOnThreads: true },
			Data.load("settings") ?? {},
		);
		this.mode = this.settings.startOnThreads ? "threads" : "members";
		this.full = false;
		this.sideQuery = "";
		this.browserQuery = "";
		this.browserFilter = "active";
		this.sideLimit = 30;
		this.browserLimit = 40;
		this.observer = new MutationObserver(this.scheduleSync);
		this.observer.observe(document.body, { childList: true, subtree: true });
		for (const store of [ChannelStore, ActiveThreadsStore, ReadStateStore])
			store?.addChangeListener?.(this.scheduleSync);
		window.addEventListener("popstate", this.scheduleSync);
		DOM.addStyle(css);
		this.scheduleSync();
	}
	stop() {
		this.observer?.disconnect();
		clearTimeout(this.timer);
		for (const store of [ChannelStore, ActiveThreadsStore, ReadStateStore])
			store?.removeChangeListener?.(this.scheduleSync);
		window.removeEventListener("popstate", this.scheduleSync);
		this.unmount();
		DOM.removeStyle();
	}
	scheduleSync() {
		if (this.timer) return;
		this.timer = setTimeout(() => {
			this.timer = null;
			this.sync();
		}, 150);
	}
	currentChannel() {
		const match = location.pathname.match(/^\/channels\/(\d+)\/(\d+)/);
		if (!match) return null;
		const [, guildId, selectedId] = match;
		const selected = ChannelStore?.getChannel?.(selectedId);
		if (!selected) return null;
		const parentId = [10, 11, 12].includes(selected.type)
			? selected.parent_id
			: selectedId;
		const parent = ChannelStore.getChannel(parentId);
		if (!parent || ![0, 5].includes(parent.type)) return null;
		return { guildId, parentId, name: parent.name || "Channel" };
	}
	findLayout() {
		for (const members of document.querySelectorAll(
			'aside[class*="membersWrap"]',
		)) {
			const rail = members.parentElement;
			const content = rail?.parentElement;
			const chat = content?.querySelector(
				':scope > main[class*="chatContent"]',
			);
			if (!chat) continue;
			const toolbar = content.parentElement?.querySelector(
				':scope > [class*="subtitleContainer"] section [class*="toolbar"]',
			);
			return { members, rail, content, chat, toolbar };
		}
		return null;
	}
	sync() {
		const channel = this.currentChannel();
		const layout = channel && this.findLayout();
		if (!channel || !layout) {
			this.unmount();
			return;
		}
		if (
			this.rail !== layout.rail ||
			this.content !== layout.content ||
			!this.root?.isConnected ||
			!this.browser?.isConnected
		) {
			this.unmount();
			this.mount(layout);
		}
		if (layout.toolbar && !this.headerButton?.isConnected)
			this.mountHeaderButton(layout.toolbar);
		if (this.channel?.parentId !== channel.parentId) {
			this.sideLimit = 30;
			this.browserLimit = 40;
		}
		this.channel = channel;
		this.rail.classList.add("tn-rail");
		this.applyMode();
		const threads = this.getThreads(channel);
		const signature = JSON.stringify([
			channel.parentId,
			threads.map((thread) => [
				thread.id,
				thread.name,
				thread.archived,
				thread.unread,
				thread.mentions,
				thread.lastMessageId,
			]),
		]);
		if (signature !== this.signature) {
			this.signature = signature;
			this.threads = threads;
			this.renderLists();
		}
	}
	getThreads({ guildId, parentId }) {
		const byId = /* @__PURE__ */ new Map();
		for (const thread of storeThreads(
			ChannelStore,
			"getAllThreadsForParent",
			parentId,
		))
			if (thread?.id) byId.set(thread.id, thread);
		for (const method of [
			"getActiveJoinedThreadsForParent",
			"getActiveUnjoinedThreadsForParent",
		]) {
			const entries = storeThreads(
				ActiveThreadsStore,
				method,
				guildId,
				parentId,
			);
			for (const value of Object.values(entries)) {
				const thread = value?.channel ?? value;
				if (thread?.id) byId.set(thread.id, thread);
			}
		}
		return [...byId.values()]
			.map((thread) => ({
				id: thread.id,
				name: thread.name || "Untitled thread",
				archived: Boolean(
					thread.threadMetadata?.archived ?? thread.thread_metadata?.archived,
				),
				unread: Boolean(ReadStateStore?.hasUnread?.(thread.id)),
				mentions: ReadStateStore?.getMentionCount?.(thread.id) ?? 0,
				lastMessageId:
					thread.lastMessageId || thread.last_message_id || thread.id,
			}))
			.sort((a, b) =>
				String(b.lastMessageId).localeCompare(String(a.lastMessageId), void 0, {
					numeric: true,
				}),
			);
	}
	mount({ members, rail, content, chat, toolbar }) {
		this.members = members;
		this.rail = rail;
		this.content = content;
		this.chat = chat;
		this.signature = null;
		this.root = node("div", "tn-root");
		const tabs = node("div", "tn-tabs");
		tabs.setAttribute("role", "tablist");
		this.threadsTab = node("button", "tn-tab", "Threads");
		this.membersTab = node("button", "tn-tab", "Members");
		for (const [button, mode] of [
			[this.threadsTab, "threads"],
			[this.membersTab, "members"],
		]) {
			button.type = "button";
			button.setAttribute("role", "tab");
			button.addEventListener("click", () => this.setMode(mode));
			tabs.append(button);
		}
		const expand = node("button", "tn-expand", "\u2922");
		expand.type = "button";
		expand.title = "Open full thread browser";
		expand.setAttribute("aria-label", "Open full thread browser");
		expand.addEventListener("click", () => this.setFull(true));
		tabs.append(expand);
		this.root.append(tabs);
		const side = node("div", "tn-sidebody");
		side.setAttribute("role", "tabpanel");
		const searchWrap = node("div", "tn-search-wrap");
		const search = node("input", "tn-search");
		search.type = "search";
		search.placeholder = "Find a thread";
		search.setAttribute("aria-label", "Find a thread in side panel");
		search.value = this.sideQuery;
		search.addEventListener("input", () => {
			this.sideQuery = search.value;
			this.sideLimit = 30;
			this.renderSide();
		});
		searchWrap.append(search);
		this.sideList = node("div", "tn-list");
		this.sideList.addEventListener("scroll", () => {
			if (
				this.sideList.scrollTop + this.sideList.clientHeight >=
				this.sideList.scrollHeight - 180
			) {
				if (this.sideLimit >= (this.sideTotal ?? 0)) return;
				this.sideLimit += 30;
				this.renderSide();
			}
		});
		side.append(searchWrap, this.sideList);
		this.root.append(side);
		rail.insertBefore(this.root, members);
		this.browser = node("div", "tn-browser");
		const bar = node("div", "tn-browser-bar");
		this.browserTitle = node("div", "tn-browser-title", "Threads");
		const close = node("button", "tn-browser-close", "\xD7");
		close.type = "button";
		close.title = "Return to channel chat";
		close.setAttribute("aria-label", "Return to channel chat");
		close.addEventListener("click", () => this.setFull(false));
		bar.append(this.browserTitle, close);
		const controls = node("div", "tn-browser-controls");
		const browserSearch = node("input", "tn-search");
		browserSearch.type = "search";
		browserSearch.placeholder = "Search threads";
		browserSearch.setAttribute("aria-label", "Search threads in browser");
		browserSearch.value = this.browserQuery;
		browserSearch.addEventListener("input", () => {
			this.browserQuery = browserSearch.value;
			this.browserLimit = 40;
			this.renderBrowser();
		});
		const filter = node("select", "tn-filter");
		filter.setAttribute("aria-label", "Filter threads");
		for (const [value, label] of [
			["active", "Active"],
			["archived", "Archived (loaded)"],
			["all", "All loaded"],
		]) {
			const option = node("option", "", label);
			option.value = value;
			filter.append(option);
		}
		filter.value = this.browserFilter;
		filter.addEventListener("change", () => {
			this.browserFilter = filter.value;
			this.browserLimit = 40;
			this.renderBrowser();
		});
		controls.append(browserSearch, filter);
		this.browserList = node("div", "tn-browser-grid");
		this.browserList.addEventListener("scroll", () => {
			if (
				this.browserList.scrollTop + this.browserList.clientHeight >=
				this.browserList.scrollHeight - 240
			) {
				if (this.browserLimit >= (this.browserTotal ?? 0)) return;
				this.browserLimit += 40;
				this.renderBrowser();
			}
		});
		this.browser.append(bar, controls, this.browserList);
		content.insertBefore(this.browser, chat);
		if (toolbar) this.mountHeaderButton(toolbar);
	}
	mountHeaderButton(toolbar) {
		this.headerButton?.remove();
		this.headerButton = node("button", "tn-header-button");
		this.headerButton.type = "button";
		this.headerButton.title = "Toggle full thread browser";
		this.headerButton.setAttribute("aria-label", "Toggle full thread browser");
		this.headerButton.innerHTML =
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="7" cy="6" r="1" fill="currentColor"/><circle cx="7" cy="12" r="1" fill="currentColor"/><circle cx="7" cy="18" r="1" fill="currentColor"/></svg>';
		this.headerButton.addEventListener("click", () => this.setFull(!this.full));
		toolbar.prepend(this.headerButton);
		this.headerButton.setAttribute("aria-pressed", String(this.full));
	}
	unmount() {
		this.rail?.classList.remove("tn-rail", "tn-threads-active");
		this.content?.classList.remove("tn-full-active");
		this.root?.remove();
		this.browser?.remove();
		this.headerButton?.remove();
		this.rail = this.content = this.root = this.browser = null;
		this.headerButton = null;
		this.signature = null;
	}
	setMode(mode) {
		this.mode = mode;
		this.applyMode();
		this.renderSide();
	}
	applyMode() {
		if (!this.root || !this.rail) return;
		this.root.dataset.mode = this.mode;
		this.rail.classList.toggle("tn-threads-active", this.mode === "threads");
		this.threadsTab.setAttribute(
			"aria-selected",
			String(this.mode === "threads"),
		);
		this.membersTab.setAttribute(
			"aria-selected",
			String(this.mode === "members"),
		);
		this.content.classList.toggle("tn-full-active", this.full);
		this.headerButton?.setAttribute("aria-pressed", String(this.full));
	}
	setFull(full) {
		if (full === this.full) return;
		if (full) {
			this.modeBeforeFull = this.mode;
			this.mode = "members";
		} else if (this.modeBeforeFull) {
			this.mode = this.modeBeforeFull;
			this.modeBeforeFull = null;
		}
		this.full = full;
		this.applyMode();
		this.renderSide();
		this.renderBrowser();
	}
	makeThreadItem(thread) {
		const item = node(
			"div",
			"tn-item" + (thread.unread ? " tn-item-unread" : ""),
		);
		const link = node("a", "tn-item-link");
		link.href = `/channels/${this.channel.guildId}/${this.channel.parentId}/threads/${thread.id}`;
		link.title = thread.name;
		link.addEventListener("click", (event) => {
			if (event.button !== 0) return;
			event.preventDefault();
			this.openThread(thread, event.metaKey);
		});
		const main = node("span", "tn-item-main");
		main.append(node("span", "tn-item-name", thread.name));
		const details = [
			thread.archived ? "Archived" : "Active",
			thread.mentions
				? `${thread.mentions} mentions`
				: thread.unread
					? "Unread"
					: "",
		]
			.filter(Boolean)
			.join(" \xB7 ");
		main.append(node("span", "tn-item-meta", details));
		link.append(main);
		item.append(link);
		const tab = node("button", "tn-tab-action", "\u2197");
		tab.type = "button";
		tab.title = "Open in ChannelTabsMac tab";
		tab.setAttribute("aria-label", `Open ${thread.name} in a new tab`);
		tab.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.openThread(thread, true);
		});
		item.append(tab);
		return item;
	}
	renderLists() {
		this.renderSide();
		this.renderBrowser();
	}
	renderSide() {
		if (!this.sideList || !this.channel) return;
		if (this.mode !== "threads") {
			if (this.sideList.childElementCount) this.sideList.replaceChildren();
			return;
		}
		const scrollTop = this.sideList.scrollTop;
		this.sideList.replaceChildren();
		const query = this.sideQuery.trim().toLocaleLowerCase();
		const threads = (this.threads ?? []).filter(
			(thread) =>
				!thread.archived && thread.name.toLocaleLowerCase().includes(query),
		);
		this.sideTotal = threads.length;
		if (threads.length) {
			this.sideList.append(
				...threads
					.slice(0, this.sideLimit)
					.map((thread) => this.makeThreadItem(thread)),
			);
			if (threads.length > this.sideLimit)
				this.sideList.append(
					node(
						"div",
						"tn-load",
						`Showing ${this.sideLimit} of ${threads.length}. Scroll for more.`,
					),
				);
			this.sideList.scrollTop = scrollTop;
			return;
		}
		const empty = node(
			"div",
			"tn-empty",
			query
				? "No matching active threads."
				: "No active threads loaded for this channel.",
		);
		if (!query) {
			const discover = node("button", "", "Open Discord thread discovery");
			discover.type = "button";
			discover.addEventListener("click", () =>
				document.querySelector('button[aria-label="Threads"]')?.click(),
			);
			empty.append(discover);
		}
		this.sideList.append(empty);
	}
	renderBrowser() {
		if (!this.browserList || !this.channel) return;
		if (!this.full) {
			if (this.browserList.childElementCount)
				this.browserList.replaceChildren();
			return;
		}
		this.browserTitle.textContent = `Threads in #${this.channel.name}`;
		const scrollTop = this.browserList.scrollTop;
		this.browserList.replaceChildren();
		const query = this.browserQuery.trim().toLocaleLowerCase();
		const threads = (this.threads ?? []).filter(
			(thread) =>
				(this.browserFilter === "all" ||
					(this.browserFilter === "archived") === thread.archived) &&
				thread.name.toLocaleLowerCase().includes(query),
		);
		this.browserTotal = threads.length;
		if (threads.length) {
			this.browserList.append(
				...threads
					.slice(0, this.browserLimit)
					.map((thread) => this.makeThreadItem(thread)),
			);
			if (threads.length > this.browserLimit)
				this.browserList.append(
					node(
						"div",
						"tn-load",
						`Showing ${this.browserLimit} of ${threads.length}. Scroll for more.`,
					),
				);
			this.browserList.scrollTop = scrollTop;
			return;
		}
		this.browserList.append(
			node("div", "tn-empty", "No matching threads loaded for this channel."),
		);
	}
	openThread(thread, inTab) {
		if (inTab) {
			if (
				globalThis.__ChannelTabsMacTabAPI?.openChannelInTab(
					this.channel.guildId,
					thread.id,
					`#${thread.name}`,
				)
			)
				return;
			UI.showToast("Enable ChannelTabsMac to open a new tab.", {
				type: "info",
			});
			return;
		}
		this.setFull(false);
		const url = `/channels/${this.channel.guildId}/${this.channel.parentId}/threads/${thread.id}`;
		if (typeof transitionTo === "function") transitionTo(url);
		else
			UI.showToast("Discord thread navigation is unavailable.", {
				type: "error",
			});
	}
	getSettingsPanel() {
		return UI.buildSettingsPanel({
			settings: [
				{
					id: "startOnThreads",
					type: "switch",
					name: "Show Threads when opening a channel",
					note: "Use the Threads tab in the right sidebar by default. You can switch to Members at any time.",
					value: this.settings.startOnThreads,
					onChange: (value) => {
						this.settings.startOnThreads = value;
						Data.save("settings", this.settings);
						this.setMode(value ? "threads" : "members");
					},
				},
			],
		});
	}
};
/*@end@*/
