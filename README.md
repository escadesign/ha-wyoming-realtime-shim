# HA Wyoming Realtime Shim Add-on Repository

[![Add repository to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fescadesign%2Fha-wyoming-realtime-shim)

This repository contains the **HA Wyoming Realtime Shim** add-on for Home Assistant OS.

## What is HA Wyoming Realtime Shim?

A Wyoming-compatible voice service that leverages **OpenAI's gpt-realtime model** for bidirectional audio conversations with your Home Assistant smart home.

### Key Features

- 🎤 **Real-time voice processing** with <500ms latency
- 🗣️ **Natural conversations** with turn detection and barge-in
- 🏠 **Smart home control** through voice commands  
- 📱 **Push-to-talk and voice activity detection** modes
- 🎛️ **Hue remote integration** for physical control
- 🔒 **Security-first** with domain whitelisting and no audio storage

## Installation

### Step 1: Add Repository

Click the button above or manually add this repository URL in Home Assistant:

1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Click the **⋮** menu → **Repositories**  
3. Add repository URL: `https://github.com/escadesign/ha-wyoming-realtime-shim`

### Step 2: Install Add-on

1. Find **"HA Wyoming Realtime Shim"** in the add-on store
2. Click **"Install"** and wait for completion
3. Configure with your OpenAI API key and HA token
4. Click **"Start"**

## Requirements

- **Home Assistant OS** (aarch64 or amd64)
- **OpenAI API key** with gpt-realtime access
- **Audio device** (UR22 MK2 or compatible)

## Configuration

```yaml
openai_api_key: "sk-your-openai-api-key"
ha_token: "your-ha-long-lived-access-token"
model: "gpt-realtime"
voice: "alloy"
allowed_domains: ["light", "switch", "climate"]
```

## Support

- 📖 **Documentation**: See the add-on's documentation tab
- 🐛 **Issues**: [GitHub Issues](https://github.com/escadesign/ha-wyoming-realtime-shim/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/escadesign/ha-wyoming-realtime-shim/discussions)
- 🏠 **HA Community**: [Home Assistant Forums](https://community.home-assistant.io/)

## Add-ons in this repository

### HA Wyoming Realtime Shim

OpenAI gpt-realtime voice integration for Home Assistant via Wyoming protocol.

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
