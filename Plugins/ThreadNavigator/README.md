# ThreadNavigator

ThreadNavigator turns Discord's **Threads** button in a text channel into a browser in the middle of the window. It replaces the channel's chat area while open. Clicking a thread opens its chat in Discord's right-side thread panel, so the browser stays visible while you move between threads. Click **×** or the Threads button again to return to the channel chat.

The browser uses Discord's chat scrollbar and stretches each thread row across the available middle pane. It has search and filters for active, loaded archived, and all loaded threads. It marks unread threads and highlights the thread currently open on the right. The arrow beside a thread, or Command-click on its name, opens a [ChannelTabsMac](../ChannelTabsMac/README.md) tab when that plugin is enabled. **Discord discovery** inside the browser opens Discord's original thread discovery view.

## Install

1. [Download ThreadNavigator.plugin.js](https://raw.githubusercontent.com/echo4eva/BetterDiscordStuff/master/Plugins/ThreadNavigator/ThreadNavigator.plugin.js).
2. Put it in BetterDiscord's `plugins` folder and enable **ThreadNavigator** in BetterDiscord's Plugins settings.
3. Optionally install and enable [ChannelTabsMac](../ChannelTabsMac/README.md) for new-tab actions.

Discord only provides the plugin with threads already loaded in the client. The archived filter does not fetch the channel's complete archive; use **Discord discovery** for older threads. This plugin targets Discord's current desktop layout and may need updates if Discord changes it. It is a community fork, not a BetterDiscord store listing.

## Develop

Edit [`src/ThreadNavigator/index.jsx`](../../src/ThreadNavigator/index.jsx), then run `npm ci` and `npm run build:threads` from the repository root. Commit the source and built plugin together. The built plugin appears in this folder; the build does not install it in BetterDiscord.

The plugin uses BetterDiscord's Webpack store access to read channels, threads, and unread state. It adds the browser beside Discord's native right-side thread panel and removes its controls when disabled. The repository's [MIT license](../../LICENSE) applies.
