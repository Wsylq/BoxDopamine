package com.dopaminebox.app.util

import android.media.AudioManager
import android.media.ToneGenerator

class SoundManager {
    private val tone = ToneGenerator(AudioManager.STREAM_MUSIC, 100)

    fun win() {
        tone.startTone(ToneGenerator.TONE_PROP_BEEP2, 120)
    }

    fun lose() {
        tone.startTone(ToneGenerator.TONE_CDMA_ABBR_ALERT, 160)
    }

    fun woohoo() {
        tone.startTone(ToneGenerator.TONE_SUP_RINGTONE, 320)
    }
}