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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.animation.core.AnimationVector1D
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
    var selected by remember { mutableStateOf("H") }
    var face by remember { mutableStateOf("H") }
    var resultText by remember { mutableStateOf("Pick heads or tails") }
    var glow by remember { mutableFloatStateOf(0f) }

    val rotation = remember { Animatable(0f) }
    val particlesProgress = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current

    val particles = remember {
        List(20) {
            val angle = Random.nextFloat() * 2f * PI.toFloat()
            val distance = Random.nextFloat() * 120f + 35f
            val velocityX = cos(angle) * distance
            val velocityY = sin(angle) * distance
            Particle(velocityX, velocityY)
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxWidth()) {
        Text(text = "Coin Flip", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text(text = resultText, color = Color.White.copy(alpha = 0.85f), fontSize = 14.sp)

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            val cosineScale = abs(cos((rotation.value % 360f) * PI.toFloat() / 180f)).coerceAtLeast(0.18f)
            Box(
                modifier = Modifier
                    .size(170.dp)
                    .scale(scaleX = cosineScale, scaleY = 1f)
                    .rotate(rotation.value * 0.04f),
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val radius = size.minDimension / 2f
                    val center = Offset(size.width / 2f, size.height / 2f)
                    val glowPx = with(density) { (18.dp + (glow * 22).dp).toPx() }
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(Color(0xFFFFF3B0).copy(alpha = 0.35f), Color.Transparent),
                            center = center,
                            radius = radius + glowPx,
                        ),
                        radius = radius + glowPx,
                        center = center,
                    )
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(Color(0xFFFFD700), Color(0xFFB8860B)),
                            center = Offset(size.width * 0.35f, size.height * 0.3f),
                            radius = radius,
                        ),
                        radius = radius,
                        center = center,
                    )
                }
                Text(face, color = Color.White, fontSize = 56.sp, fontWeight = FontWeight.ExtraBold)
            }

            Canvas(modifier = Modifier.size(230.dp)) {
                val cx = size.width / 2f
                val cy = size.height / 2f
                particles.forEachIndexed { index, particle ->
                    val p = particlesProgress.value
                    val alpha = (1f - p).coerceIn(0f, 1f)
                    val offset = Offset(cx + particle.vx * p, cy + particle.vy * p)
                    drawCircle(
                        color = if (index % 2 == 0) Color(0xFFFFD700) else Color(0xFFFFA500),
                        radius = 3f + (index % 3),
                        center = offset,
                        alpha = alpha,
                    )
                }
            }
        }

        Text(text = "Bet: $${String.format("%,d", bet)}", color = Color.White, fontWeight = FontWeight.SemiBold)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(34.dp)
                .background(Brush.horizontalGradient(listOf(Color(0xFFFFD700), Color(0xFFF97316))), RoundedCornerShape(20.dp))
                .padding(horizontal = 8.dp),
            contentAlignment = Alignment.Center,
        ) {
            Slider(
                value = bet.toFloat(),
                onValueChange = { bet = it.toInt().coerceIn(50, 10_000) },
                valueRange = 50f..10_000f,
                colors = SliderDefaults.colors(
                    thumbColor = Color(0xFFFFD700),
                    activeTrackColor = Color.Transparent,
                    inactiveTrackColor = Color.Transparent,
                ),
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            GradientActionButton(label = "HEADS 🪙", isPrimary = true, modifier = Modifier.weight(1f)) {
                selected = "H"
                scope.launch {
                    val won = doFlip(rotation, speedMultiplier)
                    face = if (won) selected else if (selected == "H") "T" else "H"
                    if (face == selected) {
                        glow = 1f
                        particlesProgress.snapTo(0f)
                        particlesProgress.animateTo(1f, animationSpec = tween(800, easing = FastOutSlowInEasing))
                        onWin((bet * 1.9f).toLong())
                        resultText = "Win! +$${(bet * 1.9f).toLong()}"
                    } else {
                        glow = 0f
                        onLose(bet.toLong())
                        resultText = "Missed it. -$bet"
                    }
                }
            }
            GradientActionButton(label = "TAILS 🌙", isPrimary = false, modifier = Modifier.weight(1f)) {
                selected = "T"
                scope.launch {
                    val won = doFlip(rotation, speedMultiplier)
                    face = if (won) selected else if (selected == "H") "T" else "H"
                    if (face == selected) {
                        glow = 1f
                        particlesProgress.snapTo(0f)
                        particlesProgress.animateTo(1f, animationSpec = tween(800, easing = FastOutSlowInEasing))
                        onWin((bet * 1.9f).toLong())
                        resultText = "Win! +$${(bet * 1.9f).toLong()}"
                    } else {
                        glow = 0f
                        onLose(bet.toLong())
                        resultText = "Missed it. -$bet"
                    }
                }
            }
        }
    }
}

private suspend fun doFlip(rotation: Animatable<Float, AnimationVector1D>, speedMultiplier: Float): Boolean {
    val target = rotation.value + 720f + (speedMultiplier * 90f)
    rotation.animateTo(
        target,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
    )
    return Random.nextBoolean()
}

private data class Particle(val vx: Float, val vy: Float)

@Composable
private fun GradientActionButton(
    label: String,
    isPrimary: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .height(56.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.horizontalGradient(
                    if (isPrimary) {
                        listOf(Color(0xFFFFD700), Color(0xFFF97316))
                    } else {
                        listOf(Color(0xFF7C3AED), Color(0xFF4F46E5))
                    }
                )
            )
            .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(20.dp))
            .padding(vertical = 14.dp)
            .background(Color.Transparent)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = label, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
    }
}