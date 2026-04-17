package com.dopaminebox.app.ui.games

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlin.random.Random

@Composable
fun CoinFlipGame(
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
) {
    var bet by remember { mutableIntStateOf(100) }
    var tiltTarget by remember { mutableFloatStateOf(0f) }
    val tilt by animateFloatAsState(targetValue = tiltTarget, label = "coin-tilt")

    Column(modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) {
        Text("Coin Flip - Bet: $$bet")
        Slider(
            value = bet.toFloat(),
            onValueChange = { bet = it.toInt().coerceIn(50, 10_000) },
            valueRange = 50f..10_000f,
        )
        Text("Flip momentum: ${"%.2f".format(tilt + speedMultiplier)}")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = {
                tiltTarget = Random.nextFloat() * 360f
                if (Random.nextBoolean()) onWin((bet * 1.8f).toLong()) else onLose(bet.toLong())
            }) { Text("Heads") }
            Button(onClick = {
                tiltTarget = Random.nextFloat() * 360f
                if (Random.nextBoolean()) onWin((bet * 1.8f).toLong()) else onLose(bet.toLong())
            }) { Text("Tails") }
        }
    }
}