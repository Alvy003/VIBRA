package com.vibra.mobile.dev

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import android.media.AudioDeviceCallback

class AudioDeviceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var isListening = false

    private val deviceCallback = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>?) {
            sendEvent()
        }
        override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>?) {
            sendEvent()
        }
    }

    override fun getName(): String = "AudioDeviceModule"

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun getCurrentAudioOutput(promise: Promise) {
        try {
            val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            
            // 1. Check if Bluetooth is active
            if (audioManager.isBluetoothA2dpOn) {
                // Pick the BEST bluetooth device (prioritize friendly names over model codes)
                val bluetoothDevice = devices.filter { isBluetooth(it.type) }
                    .maxByOrNull { getDeviceScore(it) }

                if (bluetoothDevice != null) {
                    val map = Arguments.createMap()
                    fillMap(map, bluetoothDevice)
                    promise.resolve(map)
                    return
                }
            }

            // 2. Check if Wired Headset is active
            if (audioManager.isWiredHeadsetOn) {
                val wiredDevice = devices.firstOrNull { it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES || it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET }
                if (wiredDevice != null) {
                    val map = Arguments.createMap()
                    fillMap(map, wiredDevice)
                    promise.resolve(map)
                    return
                }
            }
            
            // 3. Fallback to Speaker
            val speakerDevice = devices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
            if (speakerDevice != null) {
                val map = Arguments.createMap()
                fillMap(map, speakerDevice)
                promise.resolve(map)
                return
            }

            // 4. Absolute Fallback
            val activeDevice = devices.maxByOrNull { getDeviceScore(it) } ?: devices.firstOrNull { it.isSink }
            
            if (activeDevice != null) {
                val map = Arguments.createMap()
                fillMap(map, activeDevice)
                promise.resolve(map)
            } else {
                val map = Arguments.createMap()
                map.putString("id", "local")
                map.putString("name", "Phone Speaker")
                map.putString("type", "local")
                map.putBoolean("isBluetooth", false)
                promise.resolve(map)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getConnectedDevices(promise: Promise) {
        try {
            val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            val array = Arguments.createArray()
            
            // Group by name/type to avoid "ghost" duplicates (common with Bluetooth entries)
            val seenDevices = mutableSetOf<String>()
            
            for (device in devices) {
                if (device.isSink && device.type != AudioDeviceInfo.TYPE_TELEPHONY && device.type != AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                    val name = getDeviceName(device)
                    val key = "${name}_${device.type}"
                    if (seenDevices.contains(key)) continue
                    seenDevices.add(key)

                    val map = Arguments.createMap()
                    fillMap(map, device)
                    array.pushMap(map)
                }
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    private fun fillMap(map: WritableMap, device: AudioDeviceInfo) {
        map.putString("id", device.id.toString())
        map.putString("name", getDeviceName(device))
        map.putString("type", getDeviceTypeString(device.type))
        map.putBoolean("isBluetooth", isBluetooth(device.type))
    }

    /**
     * Scores a device based on how "Friendly" its name is.
     * High score = likely a headset or speakers.
     * Low score = likely a machine model number or system internal.
     */
    private fun getDeviceScore(device: AudioDeviceInfo): Int {
        var score = 0
        val name = device.productName.toString()
        if (name.isBlank() || name == "null") return -100

        // External devices get a boost
        if (isBluetooth(device.type)) score += 50
        if (device.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES) score += 40

        // Real products usually have spaces (e.g., "boAt Rockerz")
        if (name.contains(" ")) score += 20
        
        // Brand keywords or product indicators
        val lowerName = name.lowercase()
        val brands = listOf("sony", "boat", "bose", "apple", "airpods", "buds", "head", "rockerz", "noise", "jbl")
        for (brand in brands) {
            if (lowerName.contains(brand)) score += 30
        }

        // Penalty for model codes (mostly digits/uppercase and no spaces)
        val digitCount = name.count { it.isDigit() }
        if (digitCount > 4 && !name.contains(" ")) score -= 40
        
        // Specific user-reported model codes
        if (name.contains("22021211")) score -= 100

        return score
    }

    @ReactMethod
    fun showAudioRoutePicker(promise: Promise) {
        promise.resolve(false)
    }

    @ReactMethod
    fun startListening() {
        if (!isListening) {
            audioManager.registerAudioDeviceCallback(deviceCallback, null)
            isListening = true
        }
    }

    @ReactMethod
    fun stopListening() {
        if (isListening) {
            audioManager.unregisterAudioDeviceCallback(deviceCallback)
            isListening = false
        }
    }

    private fun sendEvent() {
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onAudioDeviceChanged", null)
    }

    private fun getDeviceName(device: AudioDeviceInfo): String {
        when (device.type) {
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> return "Phone Speaker"
            AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> return "Earpiece"
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET -> return "Wired Headphones"
        }

        val productName = device.productName.toString()
        if (productName.isNotBlank() && productName != "null" && productName.length > 2) {
            if (!(productName.length > 5 && productName.count { it.isDigit() } > 5 && !productName.contains(" "))) {
                return productName
            }
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val address = device.address
            if (!address.isNullOrBlank() && address != "00:00:00:00:00:00") {
                return address
            }
        }
        
        return if (isBluetooth(device.type)) "Bluetooth Audio" else "Audio Device"
    }

    private fun isBluetooth(type: Int): Boolean {
        return type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || 
               type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
    }

    private fun getDeviceTypeString(type: Int): String {
        return when (type) {
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bluetooth"
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET -> "headphones"
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "local"
            26 -> "tv" 
            else -> "speaker"
        }
    }
}
