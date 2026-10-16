/**
 * @name CategoryAlerts
 * @author echo4eva
 * @description Notifies you when a new channel appears in a category you watch, such as a ticket section.
 * @version 0.1.0
 * @source https://github.com/echo4eva/BetterDiscordStuff/blob/master/src/CategoryAlerts/index.jsx
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
		added: [
			"Organize ChannelTabsMac tabs in folders",
			"Navigate tabs by number and open servers in tabs",
			"Close Discord window from last tab shortcut",
			"Open ChannelTabsMac bookmarks with tab shortcut",
			"Configurable close-tab shortcut for ChannelTabsMac",
			"thread sidebar and full browser for Discord",
			"Configurable sidebar click shortcut for new tabs",
		],
		fixed: [
			"Make middle thread browser scrollable",
			"Keep thread browser open across tab switches",
			"Add macOS ChannelTabs variant",
		],
		improved: [
			"Fill thread browser and match Discord scrolling",
			"Keep thread browser beside side chat",
		],
	},
};
// src/CategoryAlerts/index.jsx
var api = new BdApi("CategoryAlerts");
var { Webpack, ContextMenu, Data, UI, React } = api;
var ChannelStore = Webpack.getStore("ChannelStore");
var GuildStore = Webpack.getStore("GuildStore");
var FluxDispatcher = Webpack.getByKeys("subscribe", "dispatch", "unsubscribe");
var transitionTo = Webpack.getByStrings("transitionTo - Transitioning to ", {
	searchExports: true,
});
var CATEGORY = 4;
var THREAD_TYPES = [10, 11, 12];
var defaults = {
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
		this.seen = /* @__PURE__ */ new Set();
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
		const body = `#${channel.name}${guild ? ` \xB7 ${guild}` : ""}`;
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
			UI.showToast(`${title}: ${body}`, { type: "info", timeout: 8e3 });
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
							"None yet. Right-click a category in the channel list and choose \u201CAlert on new channels\u201D.",
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
									`${name} \xB7 ${GuildStore?.getGuild?.(guildId)?.name ?? guildId}`,
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
/*@end@*/
