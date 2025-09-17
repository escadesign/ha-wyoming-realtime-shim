# 🎙️ Voice Assistant Setup Guide

## 🚀 Quick Start (5 Minuten Setup!)

### **Schritt 1: Add-on konfigurieren**
```yaml
# Add-on Configuration
openai_api_key: "sk-dein-openai-key"
ha_token: "dein-ha-token"
voice: "alloy"  # oder: echo, fable, onyx, nova, shimmer
allowed_domains: ["light", "switch", "climate", "media_player"]
enable_voice_assistant_mode: true
```

### **Schritt 2: Home Assistant Konfiguration**
Kopiere den Inhalt von `homeassistant/voice_assistant_config.yaml` in deine `configuration.yaml`:

```yaml
# Paste the content from voice_assistant_config.yaml here
```

### **Schritt 3: Home Assistant neu starten**
```bash
# Entwicklertools → YAML → Alle YAML-Konfigurationen neu laden
# Oder: Home Assistant neu starten
```

### **Schritt 4: Dashboard hinzufügen**
1. **Dashboard bearbeiten** → **Karte hinzufügen** → **Manuell**
2. **YAML** aus `homeassistant/dashboard_cards.yaml` kopieren
3. **Speichern**

## 🎯 Verwendung

### **🎙️ Haupt-Voice-Assistant**
```bash
# Button klicken: "🎙️ Voice Chat"
# Oder: script.voice_assistant aufrufen
```
**Workflow:**
1. Session startet
2. Spreche natürlich: "Schalte das Licht ein"
3. Höre Antwort: "Das Licht ist jetzt eingeschaltet"
4. Weiter sprechen: "Dimme es auf 30%"
5. Session endet automatisch nach Stille

### **⚡ Quick Commands**  
```bash
# Button klicken: "⚡ Quick Cmd"
# Oder: script.voice_command aufrufen
```
**Workflow:**
1. Kurze Session (10s)
2. Ein Befehl: "Wie spät ist es?"
3. Antwort + automatisches Ende

### **📱 Push-to-Talk**
```bash
# Button: "📱 Push-Talk"
# Halten während sprechen, loslassen für Verarbeitung
```

### **🔊 Voice Activity Detection**
```bash
# Button: "🔊 Voice Detection" 
# Einmal klicken = automatisches Hören aktiv
```

## 🏠 Dashboard Integrationen

### **Option 1: Einfache Buttons**
```yaml
- type: horizontal-stack
  cards:
    - type: button
      entity: script.voice_assistant
      name: "🎙️ Sprechen"
    - type: button  
      entity: script.voice_command
      name: "⚡ Befehl"
```

### **Option 2: Status Card**
```yaml
- type: entities
  title: "🎙️ Voice Assistant"
  entities:
    - input_boolean.voice_assistant_enabled
    - sensor.voice_assistant_status
    - script.voice_assistant
```

### **Option 3: Auto-Toggle**
```yaml
# Schalter im Dashboard:
input_boolean.voice_assistant_enabled: true
# → Voice Assistant startet automatisch
```

## 🎮 Physische Steuerung

### **Hue Remote Integration**
```yaml
# Automation Example
- alias: "Hue Remote Voice Control"
  trigger:
    - platform: device
      device_id: !secret hue_remote_device_id
      domain: hue
      type: short_release
      subtype: button_2  # Voice Chat
  action:
    - service: script.voice_assistant

- alias: "Hue Remote Quick Command"  
  trigger:
    - platform: device
      device_id: !secret hue_remote_device_id
      domain: hue  
      type: short_release
      subtype: button_3  # Quick Command
  action:
    - service: script.voice_command
```

### **Andere Buttons/Switches**
```yaml
# Beliebiger Button/Switch
- alias: "Wall Switch Voice"
  trigger:
    - platform: state
      entity_id: binary_sensor.wall_switch
      to: 'on'
  action:
    - service: script.voice_assistant
```

## 📱 Mobile App Integration

### **Actionable Notifications**
```yaml
# Automation für mobile Benachrichtigung
- alias: "Voice Assistant Mobile"
  trigger:
    - platform: event
      event_type: mobile_app_notification_action
      event_data:
        action: voice_assistant
  action:
    - service: script.voice_assistant
```

### **Notification mit Actions**
```yaml
- service: notify.mobile_app_dein_handy
  data:
    title: "🎙️ Voice Assistant"
    message: "Voice Assistant bereit"
    data:
      actions:
        - action: voice_assistant
          title: "🎙️ Sprechen"
        - action: voice_command  
          title: "⚡ Befehl"
```

## 🔧 Erweiterte Konfiguration

### **Sprachbefehle anpassen**
```yaml
# Add-on Options
allowed_domains: 
  - light
  - switch
  - climate
  - media_player
  - fan
  - cover
  - lock
  
entity_whitelist:
  - light.wohnzimmer
  - switch.kaffeemaschine
  - climate.heizung
```

### **Sicherheit**
```yaml
confirm_high_risk_actions: true  # Bestätigung für kritische Aktionen
enable_tts_mirror: true  # Zusätzliche TTS über HA
```

### **Performance**
```yaml
session_silence_timeout_ms: 30000  # 30s Stille = Session Ende
session_max_duration_ms: 300000    # Max 5 min pro Session
vad_enabled_default: false         # VAD standardmäßig aus
```

## 🎯 Tipps & Tricks

### **Sprachbefehle Beispiele**
- "Schalte das Wohnzimmerlicht ein"
- "Dimme alle Lichter auf 30%"
- "Stelle die Heizung auf 22 Grad"
- "Wie ist die Temperatur im Schlafzimmer?"
- "Spiele Musik im Wohnzimmer"
- "Schließe alle Rolläden"

### **Mehrsprachigkeit**
```yaml
# OpenAI gpt-realtime unterstützt automatisch:
# Deutsch, Englisch, Spanisch, Französisch, etc.
```

### **Debugging**
```bash
# Status prüfen
curl http://localhost:5000/status

# Health Check
curl http://localhost:5000/health

# Logs anschauen
# Add-on → Logs Tab
```

## ✅ Fertig!

**Du hast jetzt einen vollwertigen Voice Assistant! 🎉**

- ✅ **Dashboard Integration** 
- ✅ **Mobile Control**
- ✅ **Physische Buttons**
- ✅ **Automatisierung** 
- ✅ **Status Monitoring**
- ✅ **Erweiterte Konfiguration**

**Viel Spaß beim Sprechen mit deinem Smart Home! 🏠✨**
