package com.dopaminebox.app.ui.games

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

@Composable
fun CoinFlipGame(
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
) {
    var bet by remember { mutableIntStateOf(200) }
    var face by remember { mutableStateOf("H") }
    var status by remember { mutableStateOf("Pick a side and flip") }
    var glow by remember { mutableFloatStateOf(0f) }
    val rotation = remember { Animatable(0f) }
    val particles = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val burst = remember {
        List(20) {
            val angle = (2f * PI.toFloat() * it) / 20f
            Offset(cos(angle), sin(angle))
        }
    }

    fun play(pick: String) {
        scope.launch {
            val extraTurn = (speedMultiplier * 110f).coerceAtLeast(0f)
            rotation.animateTo(
                targetValue = rotation.value + 720f + extraTurn,
                animationSpec = tween(durationMillis = 620, easing = FastOutSlowInEasing),
            )
            val result = if (Random.nextFloat() < 0.5f) "H" else "T"
            face = result
            if (result == pick) {
                glow = 1f
                particles.snapTo(0f)
                particles.animateTo(1f, animationSpec = tween(800, easing = FastOutSlowInEasing))
                val reward = (bet * 1.9f).toLong()
                onWin(reward)
                status = "Win! +$$reward"
            } else {
                glow = 0f
                onLose(bet.toLong())
                status = "Lost -$$bet"
            }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.fillMaxWidth()) {
        Text("Coin Flip", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text(status, color = Color.White.copy(alpha = 0.85f))

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            val angle = rotation.value % 360f
            val safeScale = abs(cos(angle * PI.toFloat() / 180f)).coerceAtLeast(0.2f)
            Box(
                modifier = Modifier
                    .size(170.dp)
                    .scale(safeScale, 1f)
                    .rotate(rotation.value * 0.04f),
                contentAlignment = Alignment.Center,
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val center = Offset(size.width / 2f, size.height / 2f)
                    val radius = size.minDimension / 2f
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(Color(0x66FFD700).copy(alpha = 0.2f + glow * 0.6f), Color.Transparent),
                            center = center,
                            radius = radius * (1.2f + glow * 0.7f),
                        ),
                        radius = radius * (1.2f + glow * 0.7f),
                        center = center,
                    )
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(Color(0xFFFFD700), Color(0xFFB8860B)),
                            center = Offset(size.width * 0.35f, size.height * 0.35f),
                            radius = radius,
                        ),
                        radius = radius,
                        center = center,
                    )
                }
                Text(face, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 56.sp)
            }

            Canvas(modifier = Modifier.size(220.dp)) {
                val p = particles.value
                val cx = size.width / 2f
                val cy = size.height / 2f
                burst.forEachIndexed { index, base ->
                    val alpha = (1f - p).coerceIn(0f, 1f)
                    val distance = 90f * p
                    drawCircle(
                        color = if (index % 2 == 0) Color(0xFFFFD700) else Color(0xFFF97316),
                        radius = 3f,
                        center = Offset(cx + base.x * distance, cy + base.y * distance),
                        alpha = alpha,
                    )
                }
            }
        }

        Text("Bet: $${String.format("%,d", bet)}", color = Color.White, fontWeight = FontWeight.SemiBold)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(34.dp)
                .background(Brush.horizontalGradient(listOf(Color(0xFFFFD700), Color(0xFFF97316))), RoundedCornerShape(18.dp))
                .padding(horizontal = 8.dp),
        ) {
            Slider(
                value = bet.toFloat(),
                onValueChange = { bet = it.toInt().coerceIn(50, 10_000) },
                valueRange = 50f..10_000f,
                colors = SliderDefaults.colors(
                    thumbColor = Color.White,
                    activeTrackColor = Color.Transparent,
                    inactiveTrackColor = Color.Transparent,
                ),
            )
        }

        ActionButton(label = "HEADS 🪙", primary = true, onClick = { play("H") })
        ActionButton(label = "TAILS 🌙", primary = false, onClick = { play("T") })
    }
}

@Composable
private fun ActionButton(label: String, primary: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(
                Brush.horizontalGradient(
                    if (primary) listOf(Color(0xFFFFD700), Color(0xFFF97316)) else listOf(Color(0xFF7C3AED), Color(0xFF4F46E5)),
                ),
                RoundedCornerShape(20.dp),
            )
            .border(1.dp, Color.White.copy(alpha = 0.18f), RoundedCornerShape(20.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = Color.White, fontWeight = FontWeight.Bold)
    }
}