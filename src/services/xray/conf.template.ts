export const xrayConfigTemplate = {
  log: { loglevel: "info" },
  inbounds: [], // injected dynamically
  outbounds: [
    {
      protocol: "freedom",
      settings: {},
      tag: "direct"
    }
  ],
  routing: {
    rules: []
  }
};