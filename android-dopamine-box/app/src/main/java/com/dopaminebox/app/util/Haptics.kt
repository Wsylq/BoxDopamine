package com.dopaminebox.app.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

class Haptics(context: Context) {
    private val vibrator: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        manager.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

    fun tap() {
        vibrate(16, 80)
    }

    fun win() {
        vibrateWave(longArrayOf(0, 18, 22, 32), intArrayOf(0, 120, 0, 200))
    }

    fun lose() {
        vibrateWave(longArrayOf(0, 35, 30, 30), intArrayOf(0, 160, 0, 90))
    }

    private fun vibrate(durationMs: Long, amplitude: Int) {
        if (!vibrator.hasVibrator()) return
        vibrator.vibrate(VibrationEffect.createOneShot(durationMs, amplitude))
    }

    private fun vibrateWave(timings: LongArray, amplitudes: IntArray) {
        if (!vibrator.hasVibrator()) return
        vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
    }
}