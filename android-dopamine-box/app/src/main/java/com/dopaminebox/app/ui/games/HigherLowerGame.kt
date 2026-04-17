package com.dopaminebox.app.ui.games

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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlin.random.Random

@Composable
fun HigherLowerGame(
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
) {
    var current by remember { mutableIntStateOf(Random.nextInt(1, 99)) }
    var bet by remember { mutableIntStateOf(150) }

    Column(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Higher / Lower - Current: $current")
        Text("Speed pressure x${"%.1f".format(speedMultiplier)}")
        Slider(
            value = bet.toFloat(),
            onValueChange = { bet = it.toInt().coerceIn(50, 10_000) },
            valueRange = 50f..10_000f,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = {
                val next = Random.nextInt(1, 99)
                if (next > current) onWin((bet * 2.0f).toLong()) else onLose(bet.toLong())
                current = next
            }) { Text("Higher") }
            Button(onClick = {
                val next = Random.nextInt(1, 99)
                if (next < current) onWin((bet * 2.0f).toLong()) else onLose(bet.toLong())
                current = next
            }) { Text("Lower") }
        }
    }
}