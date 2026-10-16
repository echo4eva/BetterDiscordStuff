# ThreadNavigator

ThreadNavigator adds a **Threads / Members** switch to Discord's right sidebar for text channels. The Threads tab shows loaded active threads for the current channel, with search and unread or mention markers. Members remains one click away. A button in the channel header opens a larger thread browser in the chat area; it includes search and filters for active, loaded archived, or all loaded threads. Closing the browser returns to chat.

Click a thread to open it in Discord. Click the arrow beside a thread, or Command-click its name, to open it in a [ChannelTabsMac](../ChannelTabsMac/README.md) tab when that plugin is enabled. ThreadNavigator also works without ChannelTabsMac; the new-tab actions then show a notice.

## Install

1. [Download ThreadNavigator.plugin.js](https://raw.githubusercontent.com/echo4eva/BetterDiscordStuff/master/Plugins/ThreadNavigator/ThreadNavigator.plugin.js).
2. Put it in BetterDiscord's `plugins` folder and enable **ThreadNavigator** in BetterDiscord's Plugins settings.
3. Optionally install and enable [ChannelTabsMac](../ChannelTabsMac/README.md) for new-tab actions.

In ThreadNavigator settings, turn off **Show Threads when opening a channel** if you prefer Members as the initial sidebar tab. The switch stays available in each channel.

Discord only provides the plugin with threads already loaded in the client. The archived filter does not fetch the channel's complete archive; use Discord's own thread discovery for older threads. This plugin targets Discord's current desktop layout and may need updates if Discord changes it. It is a community fork, not a BetterDiscord store listing.

## Develop

Edit [`src/ThreadNavigator/index.jsx`](../../src/ThreadNavigator/index.jsx), then run `npm ci` and `npm run build:threads` from the repository root. Commit the source and built plugin together. The built plugin appears in this folder; the build does not install it in BetterDiscord.

The plugin uses BetterDiscord's Webpack store access to read channels, threads, and unread state. It adds its own controls to Discord's channel layout and removes them when disabled. The repository's [MIT license](../../LICENSE) applies.
