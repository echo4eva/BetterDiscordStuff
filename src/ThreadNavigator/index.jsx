const api = new BdApi("ThreadNavigator");
const { Webpack, DOM, UI } = api;

const ChannelStore = Webpack.getStore("ChannelStore");
const ActiveThreadsStore = Webpack.getStore("ActiveJoinedThreadsStore");
const ReadStateStore = Webpack.getStore("ReadStateStore");
const transitionTo = Webpack.getByStrings("transitionTo - Transitioning to ", {
	searchExports: true,
});

const css = `
.tn-full-active > main[class*="chatContent"] { display: none !important; }
.tn-browser { display: none; flex: 1; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; color: var(--text-default); background: var(--background-base-low); }
.tn-full-active > .tn-browser { display: flex; }
.tn-browser-bar { display: flex; align-items: center; gap: 10px; padding: 16px 16px 8px; flex-shrink: 0; }
.tn-browser-title { min-width: 0; flex: 1; font-size: 20px; font-weight: 700; }
.tn-browser-close, .tn-tab-action { border: 0; border-radius: 6px; color: var(--text-muted); background: transparent; cursor: pointer; font: inherit; }
.tn-browser-close { width: 30px; height: 30px; font-size: 22px; line-height: 1; }
.tn-browser-close:hover, .tn-tab-action:hover { color: var(--text-default); background: var(--background-modifier-hover); }
.tn-browser-controls { display: flex; gap: 8px; padding: 4px 16px 12px; flex-shrink: 0; }
.tn-search { min-width: 0; flex: 1; box-sizing: border-box; border: 0; outline: 0; border-radius: 6px; padding: 8px 10px; color: var(--text-default); background: var(--background-base-lower); font: inherit; font-size: 13px; }
.tn-filter, .tn-discover { border: 0; border-radius: 6px; padding: 6px 10px; background: var(--background-base-lower); color: var(--text-default); font: inherit; cursor: pointer; }
.tn-browser > .tn-browser-list { display: flex; flex: 1 1 0; flex-direction: column; gap: 5px; min-height: 0; overflow-x: hidden; overflow-y: auto; padding: 4px 8px 24px 16px; scrollbar-width: thin; scrollbar-color: var(--scrollbar-auto-thumb, var(--background-modifier-hover)) var(--scrollbar-auto-track, transparent); }
.tn-browser-list::-webkit-scrollbar { width: 8px; }
.tn-browser-list::-webkit-scrollbar-thumb { border-radius: 4px; background: var(--scrollbar-auto-thumb, var(--background-modifier-hover)); }
.tn-browser-list::-webkit-scrollbar-track { background: var(--scrollbar-auto-track, transparent); }
.tn-item { display: flex; flex-shrink: 0; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--background-base-lower); color: var(--text-default); }
.tn-item:hover { background: var(--background-modifier-hover); }
.tn-item-selected { border-color: var(--brand-500); background: var(--background-modifier-selected); }
.tn-item-link { display: block; min-width: 0; flex: 1; color: inherit; text-decoration: none; }
.tn-item-main { display: block; min-width: 0; }
.tn-item-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
.tn-item-meta { display: block; margin-top: 4px; color: var(--text-muted); font-size: 11px; }
.tn-item-unread .tn-item-name::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin: 0 6px 1px 0; background: var(--brand-500); }
.tn-tab-action { flex-shrink: 0; width: 28px; height: 28px; font-size: 17px; line-height: 1; }
.tn-empty, .tn-load { padding: 18px 12px; color: var(--text-muted); text-align: center; font-size: 13px; }
`;

function node(tag, className, text) {
	const element = document.createElement(tag);
	if (className) element.className = className;
	if (text !== undefined) element.textContent = text;
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
		this.onNativeThreadsClick = this.onNativeThreadsClick.bind(this);
		this.onNativeThreadsKeyDown = this.onNativeThreadsKeyDown.bind(this);
	}

	start() {
		this.full = false;
		this.browserQuery = "";
		this.browserFilter = "active";
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
		const match = location.pathname.match(
			/^\/channels\/(\d+)\/(\d+)(?:\/threads\/(\d+))?/,
		);
		if (!match) return null;
		const [, guildId, selectedId, sideThreadId] = match;
		const selected = ChannelStore?.getChannel?.(selectedId);
		if (!selected) return null;
		const isThread = [10, 11, 12].includes(selected.type);
		const parentId = isThread ? selected.parent_id : selectedId;
		const parent = ChannelStore.getChannel(parentId);
		if (!parent || ![0, 5].includes(parent.type)) return null;
		return {
			guildId,
			parentId,
			selectedThreadId: sideThreadId || (isThread ? selectedId : null),
			name: parent.name || "Channel",
		};
	}

	findLayout() {
		for (const chat of document.querySelectorAll(
			'main[class*="chatContent"]',
		)) {
			const content = chat.parentElement;
			const toolbar = content.parentElement?.querySelector(
				':scope > [class*="subtitleContainer"] section [class*="toolbar"]',
			);
			if (!toolbar) continue;
			return { content, chat, toolbar };
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
		if (this.content !== layout.content || !this.browser?.isConnected) {
			this.unmount();
			this.mount(layout);
		}
		this.mountNativeButton(layout.toolbar);
		if (this.channel?.parentId !== channel.parentId) {
			this.browserLimit = 40;
		}
		this.channel = channel;
		this.applyMode();
		const threads = this.getThreads(channel);
		const signature = JSON.stringify([
			channel.parentId,
			channel.selectedThreadId,
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
			this.renderBrowser();
		}
	}

	getThreads({ guildId, parentId }) {
		const byId = new Map();
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
				String(b.lastMessageId).localeCompare(
					String(a.lastMessageId),
					undefined,
					{ numeric: true },
				),
			);
	}

	mount({ content, chat }) {
		this.content = content;
		this.chat = chat;
		this.signature = null;
		this.browser = node("div", "tn-browser");
		const bar = node("div", "tn-browser-bar");
		this.browserTitle = node("div", "tn-browser-title", "Threads");
		const close = node("button", "tn-browser-close", "×");
		close.type = "button";
		close.title = "Return to channel chat";
		close.setAttribute("aria-label", "Return to channel chat");
		close.addEventListener("click", () => this.setFull(false));
		bar.append(this.browserTitle, close);
		const controls = node("div", "tn-browser-controls");
		const search = node("input", "tn-search");
		search.type = "search";
		search.placeholder = "Search threads";
		search.setAttribute("aria-label", "Search threads in browser");
		search.value = this.browserQuery;
		search.addEventListener("input", () => {
			this.browserQuery = search.value;
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
		const discover = node("button", "tn-discover", "Discord discovery");
		discover.type = "button";
		discover.title = "Open Discord's thread discovery";
		discover.addEventListener("click", () => this.openNativeDiscovery());
		controls.append(search, filter, discover);
		this.browserList = node("div", "tn-browser-list");
		this.browserList.addEventListener("scroll", () => {
			if (this.browserLimit >= (this.browserTotal ?? 0)) return;
			if (
				this.browserList.scrollTop + this.browserList.clientHeight >=
				this.browserList.scrollHeight - 240
			) {
				this.browserLimit += 40;
				this.renderBrowser();
			}
		});
		this.browser.append(bar, controls, this.browserList);
		content.insertBefore(this.browser, chat);
	}

	mountNativeButton(toolbar) {
		const button = toolbar?.querySelector(
			'[role="button"][aria-label="Threads"]',
		);
		if (button === this.nativeButton) return;
		this.nativeButton?.removeEventListener(
			"click",
			this.onNativeThreadsClick,
			true,
		);
		this.nativeButton?.removeEventListener(
			"keydown",
			this.onNativeThreadsKeyDown,
			true,
		);
		if (this.nativeButton) this.nativeButton.title = this.nativeButtonTitle;
		this.nativeButton = button ?? null;
		if (!button) return;
		this.nativeButtonTitle = button.title;
		button.title = "Toggle thread browser";
		button.addEventListener("click", this.onNativeThreadsClick, true);
		button.addEventListener("keydown", this.onNativeThreadsKeyDown, true);
		button.setAttribute("aria-pressed", String(this.full));
	}

	onNativeThreadsKeyDown(event) {
		if (!["Enter", " "].includes(event.key)) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		this.setFull(!this.full);
	}

	onNativeThreadsClick(event) {
		if (this.allowNativeOnce) {
			this.allowNativeOnce = false;
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		this.setFull(!this.full);
	}

	openNativeDiscovery() {
		if (!this.nativeButton?.isConnected) return;
		this.allowNativeOnce = true;
		this.nativeButton.click();
		this.allowNativeOnce = false;
	}

	unmount() {
		this.nativeButton?.removeEventListener(
			"click",
			this.onNativeThreadsClick,
			true,
		);
		this.nativeButton?.removeEventListener(
			"keydown",
			this.onNativeThreadsKeyDown,
			true,
		);
		if (this.nativeButton) {
			this.nativeButton.title = this.nativeButtonTitle;
			this.nativeButton.removeAttribute("aria-pressed");
		}
		this.nativeButton = null;
		this.content?.classList.remove("tn-full-active");
		this.browser?.remove();
		this.content = this.browser = null;
		this.signature = null;
	}

	applyMode() {
		this.content?.classList.toggle("tn-full-active", this.full);
		this.nativeButton?.setAttribute("aria-pressed", String(this.full));
	}

	setFull(full) {
		if (full === this.full) return;
		this.full = full;
		this.applyMode();
		this.renderBrowser();
	}

	makeThreadItem(thread) {
		const selected = thread.id === this.channel.selectedThreadId;
		const item = node(
			"div",
			"tn-item" +
				(thread.unread ? " tn-item-unread" : "") +
				(selected ? " tn-item-selected" : ""),
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
			selected ? "Open on right" : "",
		]
			.filter(Boolean)
			.join(" · ");
		main.append(node("span", "tn-item-meta", details));
		link.append(main);
		item.append(link);
		const tab = node("button", "tn-tab-action", "↗");
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
		const url = `/channels/${this.channel.guildId}/${this.channel.parentId}/threads/${thread.id}`;
		if (typeof transitionTo === "function") transitionTo(url);
		else
			UI.showToast("Discord thread navigation is unavailable.", {
				type: "error",
			});
	}
};
