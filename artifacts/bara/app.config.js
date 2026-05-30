const base = require("./app.json");

module.exports = {
  ...base.expo,
  plugins: base.expo.plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "@rnmapbox/maps") {
      return [
        plugin[0],
        {
          ...plugin[1],
          RNMapboxMapsDownloadToken:
            process.env.EXPO_PUBLIC_MAPBOX_TOKEN || plugin[1].RNMapboxMapsDownloadToken,
        },
      ];
    }
    return plugin;
  }),
};
