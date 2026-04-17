package com.dopaminebox.app.ui.games

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import kotlin.random.Random

@Composable
fun PlinkoGame(
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
) {
    val drop = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Plinko - Drop and pray")
        Canvas(modifier = Modifier.fillMaxWidth().height(120.dp)) {
            val rows = 5
            for (r in 0 until rows) {
                for (c in 0..r) {
                    val x = (size.width / (r + 1)) * c + (size.width / (2f * (r + 1)))
                    val y = 20f + r * 18f
                    drawCircle(color = Color.White.copy(alpha = 0.7f), radius = 3.5f, center = Offset(x, y))
                }
            }
            drawCircle(
                color = Color.Yellow,
                radius = 7f,
                center = Offset(size.width * (0.5f + drop.value * 0.35f), 15f + drop.value * 90f)
            )
        }
        Button(onClick = {
            scope.launch {
                drop.snapTo(0f)
                drop.animateTo(1f, animationSpec = tween((1000 / speedMultiplier).toInt().coerceAtLeast(300)))
                when (Random.nextInt(100)) {
                    in 0..9 -> onWin(1500)
                    in 10..50 -> onWin(400)
                    else -> onLose(250)
                }
            }
        }) {
            Text("Drop Ball")
        }
    }
}