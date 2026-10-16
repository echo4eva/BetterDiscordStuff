# CategoryAlerts

CategoryAlerts notifies you when a new channel is created inside a category you choose, for example a **Tickets** section where each ticket gets its own channel. Discord has no notification setting for categories, so new ticket channels are easy to miss.

## Use

1. Right-click a category in the channel list and choose **Alert on new channels**. Choose it again to stop watching.
2. When a channel appears in that category you get a desktop notification, an in-app toast, or both. Clicking the desktop notification opens the new channel.

Plugin settings let you turn the desktop notification, its sound, and the toast on or off, and list the watched categories so you can remove them.

## Install

1. [Download CategoryAlerts.plugin.js](https://raw.githubusercontent.com/echo4eva/BetterDiscordStuff/master/Plugins/CategoryAlerts/CategoryAlerts.plugin.js).
2. Put it in BetterDiscord's `plugins` folder and enable **CategoryAlerts** in BetterDiscord's Plugins settings.

Alerts only arrive while Discord is running and connected. Threads are ignored; only channels created directly in the watched category trigger an alert.

## Develop

Edit [`src/CategoryAlerts/index.jsx`](../../src/CategoryAlerts/index.jsx), then run `npm ci` and `npm run build:alerts` from the repository root. Commit the source and built plugin together. The repository's [MIT license](../../LICENSE) applies.
