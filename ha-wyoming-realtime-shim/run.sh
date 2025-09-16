#!/usr/bin/with-contenv bashio

# ==============================================================================
# HA Wyoming Realtime Shim Add-on
# Starts the Wyoming Realtime Shim service
# ==============================================================================

# Initialize audio system for HA OS
bashio::log.info "Initializing audio system..."

# Configure PulseAudio for HA OS environment
if bashio::fs.directory_exists "/etc/pulse"; then
    bashio::log.info "Configuring PulseAudio..."
    echo "load-module module-native-protocol-unix socket=/tmp/pulse-socket" >> /etc/pulse/default.pa
fi

# Get configuration from HA add-on options
CONFIG_PATH="/data/options.json"

# Export configuration as environment variables
export OPENAI_API_KEY="$(bashio::config 'openai_api_key')"
export REALTIME_API_URL="$(bashio::config 'realtime_api_url')"
export MODEL="$(bashio::config 'model')"
export AUDIO_FORMAT="$(bashio::config 'audio_format')"
export HA_URL="$(bashio::config 'ha_url')"
export HA_TOKEN="$(bashio::config 'ha_token')"
export ALLOWED_DOMAINS="$(bashio::config 'allowed_domains')"
export ENTITY_WHITELIST="$(bashio::config 'entity_whitelist')"
export CONFIRM_HIGH_RISK_ACTIONS="$(bashio::config 'confirm_high_risk_actions')"
export ENABLE_TTS_MIRROR="$(bashio::config 'enable_tts_mirror')"
export TTS_SERVICE="$(bashio::config 'tts_service')"
export TTS_MEDIA_PLAYER="$(bashio::config 'tts_media_player')"
export HTTP_PORT="$(bashio::config 'http_port')"
export VAD_ENABLED_DEFAULT="$(bashio::config 'vad_enabled_default')"
export SESSION_SILENCE_TIMEOUT_MS="$(bashio::config 'session_silence_timeout_ms')"
export SESSION_MAX_DURATION_MS="$(bashio::config 'session_max_duration_ms')"

# Validate required configuration
if bashio::var.is_empty "${OPENAI_API_KEY}"; then
    bashio::log.fatal "OpenAI API key is required! Please configure 'openai_api_key'."
    bashio::exit.nok
fi

if bashio::var.is_empty "${HA_TOKEN}"; then
    bashio::log.fatal "Home Assistant token is required! Please configure 'ha_token'."
    bashio::exit.nok
fi

# Log startup information
bashio::log.info "Starting HA Wyoming Realtime Shim..."
bashio::log.info "Model: ${MODEL}"
bashio::log.info "Audio format: ${AUDIO_FORMAT}"
bashio::log.info "HTTP API port: ${HTTP_PORT}"
bashio::log.info "Wyoming protocol port: 10600"

# Change to app directory
cd /app

# Start the application
bashio::log.info "Starting Node.js application..."
exec node index.js
