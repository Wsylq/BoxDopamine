package com.dopaminebox.app.ui.games

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun FlappyCoinsGame(
    speedMultiplier: Float,
    index: Int,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
    onWoohoo: () -> Unit,
) {
    var birdY by remember { mutableFloatStateOf(0.5f) }
    var velocityY by remember { mutableFloatStateOf(0f) }
    var pipeX by remember { mutableFloatStateOf(1.2f) }
    var gapCenter by remember { mutableFloatStateOf(0.5f) }
    var coinsCollected by remember { mutableIntStateOf(0) }
    var pipesCleared by remember { mutableIntStateOf(0) }
    var streak by remember { mutableIntStateOf(0) }
    var running by remember { mutableStateOf(true) }
    var passedCurrentPipe by remember { mutableStateOf(false) }
    var showWoohoo by remember { mutableStateOf(false) }
    val woohooAlpha = remember { Animatable(0f) }
    val woohooScale = remember { Animatable(0.7f) }
    val density = LocalDensity.current

    val gravity = 0.4f
    val flapForce = -8f
    val gapHeight = 0.34f
    val pipeWidth = 0.16f
    val baseSpeed = 0.0085f
    val birdX = 0.26f

    LaunchedEffect(running, speedMultiplier) {
        if (!running) return@LaunchedEffect
        while (running) {
            delay(16)
            velocityY += gravity
            birdY += velocityY / 100f
            pipeX -= baseSpeed * speedMultiplier.coerceAtLeast(0.7f)

            val gapTop = gapCenter - (gapHeight / 2f)
            val gapBottom = gapCenter + (gapHeight / 2f)
            val overlapsPipeX = birdX + 0.04f > pipeX && birdX - 0.04f < pipeX + pipeWidth
            val inGap = birdY in gapTop..gapBottom

            if (birdY <= 0f || birdY >= 1f || (overlapsPipeX && !inGap)) {
                running = false
                onLose(350L)
                break
            }

            if (!passedCurrentPipe && pipeX + pipeWidth < birdX) {
                passedCurrentPipe = true
                pipesCleared += 1
                streak += 1
                onWin((400L * pipesCleared).coerceAtLeast(400L))
                if (streak >= 3) {
                    showWoohoo = true
                    onWoohoo()
                    woohooAlpha.snapTo(1f)
                    woohooScale.snapTo(0.7f)
                    woohooScale.animateTo(1.1f, animationSpec = tween(220, easing = FastOutSlowInEasing))
                    woohooScale.animateTo(1f, animationSpec = tween(200, easing = FastOutSlowInEasing))
                    woohooAlpha.animateTo(0f, animationSpec = tween(600, easing = FastOutSlowInEasing))
                    showWoohoo = false
                    streak = 0
                }
            }

            val coinX = pipeX + pipeWidth / 2f
            val coinY = gapCenter
            val hitCoin = kotlin.math.abs(coinX - birdX) < 0.05f && kotlin.math.abs(coinY - birdY) < 0.05f
            if (hitCoin) {
                coinsCollected += 1
            }

            if (pipeX < -pipeWidth) {
                pipeX = 1.2f
                gapCenter = (0.28f..0.72f).random()
                passedCurrentPipe = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Flappy Coins", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text(
            "Coins ✦ $coinsCollected  |  Pipes $pipesCleared  |  Lane ${index % 4 + 1}",
            color = Color.White.copy(alpha = 0.84f),
            fontSize = 14.sp,
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
                .background(Color(0x66240B3F), RoundedCornerShape(16.dp))
                .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(16.dp))
                .pointerInput(running) {
                    detectTapGestures {
                        if (!running) {
                            running = true
                            birdY = 0.5f
                            velocityY = flapForce
                            pipeX = 1.2f
                            gapCenter = 0.5f
                            pipesCleared = 0
                            streak = 0
                            coinsCollected = 0
                            passedCurrentPipe = false
                        } else {
                            velocityY = flapForce
                        }
                    }
                },
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                val birdRadius = with(density) { 14.dp.toPx() }

                val px = pipeX * w
                val pw = pipeWidth * w
                val gapTopPx = (gapCenter - gapHeight / 2f) * h
                val gapBottomPx = (gapCenter + gapHeight / 2f) * h

                drawRect(
                    color = Color(0xFF5B21B6),
                    topLeft = androidx.compose.ui.geometry.Offset(px, 0f),
                    size = androidx.compose.ui.geometry.Size(pw, gapTopPx),
                )
                drawRect(
                    color = Color(0xFF5B21B6),
                    topLeft = androidx.compose.ui.geometry.Offset(px, gapBottomPx),
                    size = androidx.compose.ui.geometry.Size(pw, h - gapBottomPx),
                )

                val coinX = (pipeX + pipeWidth / 2f) * w
                val coinY = gapCenter * h
                drawCircle(color = Color(0xFFFFD700), radius = with(density) { 6.dp.toPx() }, center = androidx.compose.ui.geometry.Offset(coinX, coinY))

                drawCircle(
                    color = Color(0xFFFFD700),
                    radius = birdRadius,
                    center = androidx.compose.ui.geometry.Offset(birdX * w, birdY * h),
                )
            }

            if (!running) {
                Text(
                    text = "Tap to restart",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            androidx.compose.animation.AnimatedVisibility(
                visible = showWoohoo,
                modifier = Modifier.align(Alignment.Center),
            ) {
                Text(
                    text = "Woohoo! 🎉",
                    color = Color.White,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier
                        .alpha(woohooAlpha.value)
                        .scale(woohooScale.value),
                )
            }
        }
    }
}

private fun ClosedFloatingPointRange<Float>.random(): Float {
    return (start + Math.random() * (endInclusive - start)).toFloat()
}