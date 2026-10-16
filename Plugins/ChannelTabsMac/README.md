# ChannelTabsMac

ChannelTabsMac is a macOS layout variant of [ChannelTabs](../ChannelTabs/README.md) 2.8.9. The three navigation buttons sit together immediately to the right of the native red, yellow, and green window controls. The first tab follows the buttons. The layout change applies only on macOS.

On macOS, **Command-click** a channel, thread, direct message, or ChannelTabsMac bookmark to open it in a ChannelTabs tab. This also works for bookmarks inside folders. Your current view stays open unless you have enabled **Always focus new tabs**. In **ChannelTabsMac → Settings → Behavior**, choose a different click shortcut (Command-Shift, Option, Option-Shift, or Shift) or turn it off. The existing **ChannelTabs → Open in new tab** right-click menu remains available.

Press **Option-W** to close the current tab. If it is the last tab, the same shortcut closes the Discord window while keeping that tab saved for the next launch. In **ChannelTabsMac → Settings → Behavior → Close current tab**, record a different keybind or clear it to disable the shortcut. The quick settings menu shows the currently assigned keybind.

Discord may process its native **Command-W** window shortcut before ChannelTabsMac receives the key press, so assigning Command-W is not guaranteed to close a tab first. Option-W avoids that conflict.

[ThreadNavigator](../ThreadNavigator/README.md) can also open its listed threads in ChannelTabsMac tabs using the arrow beside each thread or Command-click on its name.

## Install

1. [Download ChannelTabsMac.plugin.js](https://raw.githubusercontent.com/echo4eva/BetterDiscordStuff/master/Plugins/ChannelTabsMac/ChannelTabsMac.plugin.js).
2. Put the file in BetterDiscord's `plugins` folder and enable **ChannelTabsMac** in BetterDiscord's Plugins settings.
3. Disable **ChannelTabs** if it is installed; both plugins patch the same title bar.

This is a community fork, not a BetterDiscord store listing. The plugin keeps its own settings under the ChannelTabsMac name. Existing ChannelTabs settings are not copied automatically.

## Develop

Edit [`src/ChannelTabsMac/index.jsx`](../../src/ChannelTabsMac/index.jsx), then run `npm ci` and `npm run build:mac` from the repository root. The built plugin appears in this folder. Commit source and built plugin together so the download stays current. `npm run build:mac` does not change installed BetterDiscord plugins.

The macOS title bar rules are in `MacTitleBarStyle` in `applyStyle()`. The original authors retain credit, and this fork retains the repository's [MIT license](../../LICENSE).
