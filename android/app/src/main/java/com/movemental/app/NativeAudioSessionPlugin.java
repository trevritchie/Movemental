package com.movemental.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Android audio-focus counterpart to the iOS AVAudioSession plugin.
 * JS maps audioSessionEvent onto AudioEngine page background/foreground.
 */
@CapacitorPlugin(name = "NativeAudioSession")
public class NativeAudioSessionPlugin extends Plugin {
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private final AudioManager.OnAudioFocusChangeListener focusListener =
        focusChange -> {
            JSObject data = new JSObject();
            if (
                focusChange == AudioManager.AUDIOFOCUS_LOSS ||
                focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ||
                focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK
            ) {
                data.put("type", "interruption");
                data.put("state", "began");
                notifyListeners("audioSessionEvent", data);
            } else if (focusChange == AudioManager.AUDIOFOCUS_GAIN) {
                data.put("type", "interruption");
                data.put("state", "ended");
                data.put("shouldResume", true);
                notifyListeners("audioSessionEvent", data);
            }
        };

    @Override
    public void load() {
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        requestPlaybackFocus();
    }

    @PluginMethod
    public void configure(PluginCall call) {
        boolean granted = requestPlaybackFocus();
        JSObject ret = new JSObject();
        ret.put("active", granted);
        call.resolve(ret);
    }

    private boolean requestPlaybackFocus() {
        if (audioManager == null) {
            return false;
        }

        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(attrs)
                .setOnAudioFocusChangeListener(focusListener)
                .build();
            result = audioManager.requestAudioFocus(focusRequest);
        } else {
            result = audioManager.requestAudioFocus(
                focusListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            );
        }
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }
}
