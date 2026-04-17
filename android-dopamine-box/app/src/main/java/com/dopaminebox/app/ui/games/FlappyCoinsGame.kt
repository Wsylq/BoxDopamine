package com.dopaminebox.app.ui.games

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlin.random.Random

@Composable
fun FlappyCoinsGame(
    speedMultiplier: Float,
    index: Int,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
    onWoohoo: () -> Unit,
) {
    var altitude by remember { mutableIntStateOf(50) }
    var coinsCollected by remember { mutableIntStateOf(0) }
    var woohoo by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Flappy Coins")
        Text("Altitude: $altitude | Coins: $coinsCollected | Lane: ${index % 4 + 1}")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = {
                altitude = (altitude + (12 * speedMultiplier).toInt()).coerceAtMost(100)
                if (Random.nextBoolean()) {
                    coinsCollected += 1
                    if (coinsCollected >= 5) {
                        woohoo = true
                        onWoohoo()
                        onWin(2200)
                        coinsCollected = 0
                    }
                }
            }) { Text("Flap") }
            Button(onClick = {
                altitude = (altitude - 16).coerceAtLeast(0)
                if (altitude < 12) {
                    woohoo = false
                    onLose(350)
                }
            }) { Text("Drift") }
        }
        AnimatedVisibility(visible = woohoo) {
            Text("Woohoo! Bonus unlocked")
        }
    }
}