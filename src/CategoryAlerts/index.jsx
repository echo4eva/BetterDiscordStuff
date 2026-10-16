const api = new BdApi("CategoryAlerts");
const { Webpack, ContextMenu, Data, UI, React } = api;

const ChannelStore = Webpack.getStore("ChannelStore");
const GuildStore = Webpack.getStore("GuildStore");
const FluxDispatcher = Webpack.getByKeys(
	"subscribe",
	"dispatch",
	"unsubscribe",
);
const transitionTo = Webpack.getByStrings("transitionTo - Transitioning to ", {
	searchExports: true,
});

const CATEGORY = 4;
const THREAD_TYPES = [10, 11, 12];

const defaults = {
	watched: {},
	desktop: true,
	toast: true,
	sound: true,
};

module.exports = class CategoryAlerts {
	constructor(meta) {
		this.meta = meta;
		this.onChannelCreate = this.onChannelCreate.bind(this);
	}

	start() {
		this.settings = { ...defaults, ...(Data.load("settings") ?? {}) };
		this.seen = new Set();
		FluxDispatcher?.subscribe("CHANNEL_CREATE", this.onChannelCreate);
		this.unpatchMenu = ContextMenu.patch("channel-context", (menu, props) => {
			const category = props?.channel;
			if (category?.type !== CATEGORY) return;
			menu.props.children.push(
				ContextMenu.buildMenuChildren([
					{
						type: "group",
						items: [
							{
								type: "toggle",
								label: "Alert on new channels",
								checked: Boolean(this.settings.watched[category.id]),
								action: () => this.toggleWatch(category),
							},
						],
					},
				]),
			);
		});
	}

	stop() {
		FluxDispatcher?.unsubscribe("CHANNEL_CREATE", this.onChannelCreate);
		this.unpatchMenu?.();
	}

	save() {
		Data.save("settings", this.settings);
	}

	toggleWatch(category) {
		const watched = this.settings.watched;
		if (watched[category.id]) {
			delete watched[category.id];
			UI.showToast(`No longer watching ${category.name}`, { type: "info" });
		} else {
			watched[category.id] = {
				name: category.name,
				guildId: category.guild_id,
			};
			UI.showToast(`Watching ${category.name} for new channels`, {
				type: "success",
			});
		}
		this.save();
	}

	onChannelCreate({ channel }) {
		if (!channel?.parent_id || !this.settings.watched[channel.parent_id])
			return;
		if (channel.type === CATEGORY || THREAD_TYPES.includes(channel.type))
			return;
		if (this.seen.has(channel.id)) return;
		this.seen.add(channel.id);
		this.notify(channel);
	}

	notify(channel) {
		const guildId = channel.guild_id;
		const category = this.settings.watched[channel.parent_id].name;
		const guild = GuildStore?.getGuild?.(guildId)?.name ?? "";
		const title = `New channel in ${category}`;
		const body = `#${channel.name}${guild ? ` · ${guild}` : ""}`;
		const open = () => transitionTo?.(`/channels/${guildId}/${channel.id}`);

		if (this.settings.desktop) {
			const notification = new Notification(title, {
				body,
				silent: !this.settings.sound,
			});
			notification.onclick = () => {
				window.focus();
				open();
			};
		}
		if (this.settings.toast) {
			UI.showToast(`${title}: ${body}`, { type: "info", timeout: 8000 });
		}
	}

	getSettingsPanel() {
		const plugin = this;
		return React.createElement(function Panel() {
			const [, rerender] = React.useReducer((n) => n + 1, 0);
			const entries = Object.entries(plugin.settings.watched);
			return React.createElement(
				"div",
				null,
				UI.buildSettingsPanel({
					settings: [
						{
							type: "switch",
							id: "desktop",
							name: "Desktop notification",
							note: "Clicking it opens the new channel.",
							value: plugin.settings.desktop,
						},
						{
							type: "switch",
							id: "sound",
							name: "Notification sound",
							value: plugin.settings.sound,
						},
						{
							type: "switch",
							id: "toast",
							name: "In-app toast",
							value: plugin.settings.toast,
						},
					],
					onChange: (_category, id, value) => {
						plugin.settings[id] = value;
						plugin.save();
					},
				}),
				React.createElement(
					"h3",
					{ style: { color: "var(--header-primary)", margin: "16px 0 8px" } },
					"Watched categories",
				),
				entries.length === 0
					? React.createElement(
							"div",
							{ style: { color: "var(--text-muted)" } },
							"None yet. Right-click a category in the channel list and choose “Alert on new channels”.",
						)
					: entries.map(([id, { name, guildId }]) =>
							React.createElement(
								"div",
								{
									key: id,
									style: {
										display: "flex",
										alignItems: "center",
										gap: 8,
										padding: "6px 0",
										color: "var(--text-default)",
									},
								},
								React.createElement(
									"span",
									{ style: { flex: 1 } },
									`${name} · ${GuildStore?.getGuild?.(guildId)?.name ?? guildId}`,
								),
								React.createElement(
									"button",
									{
										onClick: () => {
											delete plugin.settings.watched[id];
											plugin.save();
											rerender();
										},
									},
									"Remove",
								),
							),
						),
			);
		});
	}
};
