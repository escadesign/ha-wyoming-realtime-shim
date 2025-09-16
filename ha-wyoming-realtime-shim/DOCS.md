# HA Wyoming Realtime Shim

OpenAI gpt-realtime voice integration for Home Assistant.

## Configuration

Required:
- **openai_api_key**: Your OpenAI API key (starts with `sk-`)
- **ha_token**: Home Assistant long-lived access token

Optional:
- **model**: OpenAI model (default: `gpt-realtime`)
- **voice**: AI voice type (default: `alloy`)
- **allowed_domains**: HA domains to control (default: `["light", "switch", "climate"]`)

## Setup

1. Get OpenAI API key from [platform.openai.com](https://platform.openai.com/)
2. Create HA token in **Settings** → **Security** → **Long-lived access tokens**
3. Configure add-on with your keys and start

## Usage

Voice commands like:
- "Turn on living room lights"
- "Set thermostat to 72 degrees"
- "What's the temperature?"

See the repository README for full documentation and examples.
