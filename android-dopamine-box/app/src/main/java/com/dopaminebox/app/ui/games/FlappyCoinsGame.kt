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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.random.Random

@Composable
fun FlappyCoinsGame(
    speedMultiplier: Float,
    index: Int,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
    onWoohoo: () -> Unit,
) {
    var running by remember { mutableStateOf(true) }
    var birdY by remember { mutableFloatStateOf(0.5f) }
    var birdVelocity by remember { mutableFloatStateOf(0f) }
    var pipeX by remember { mutableFloatStateOf(1.2f) }
    var gapCenter by remember { mutableFloatStateOf(0.5f) }
    var pipesCleared by remember { mutableIntStateOf(0) }
    var coinsCollected by remember { mutableIntStateOf(0) }
    var currentStreak by remember { mutableIntStateOf(0) }
    var pipeAlreadyScored by remember { mutableStateOf(false) }
    var coinAlreadyScored by remember { mutableStateOf(false) }
    var showWoohoo by remember { mutableStateOf(false) }
    val woohooAlpha = remember { Animatable(0f) }
    val woohooScale = remember { Animatable(0.8f) }

    val gravity = 0.4f
    val flapForce = -8f
    val baseSpeed = 0.0075f
    val birdX = 0.25f
    val birdRadius = 0.05f
    val pipeWidth = 0.16f
    val gapHeight = 0.36f

    LaunchedEffect(running, speedMultiplier) {
        if (!running) return@LaunchedEffect
        while (running) {
            delay(16)
            birdVelocity += gravity
            birdY += birdVelocity / 100f
            pipeX -= baseSpeed * speedMultiplier.coerceAtLeast(0.7f)

            val gapTop = gapCenter - gapHeight / 2f
            val gapBottom = gapCenter + gapHeight / 2f

            val birdRect = Rect(
                left = birdX - birdRadius,
                top = birdY - birdRadius,
                right = birdX + birdRadius,
                bottom = birdY + birdRadius,
            )
            val topPipeRect = Rect(pipeX, 0f, pipeX + pipeWidth, gapTop)
            val bottomPipeRect = Rect(pipeX, gapBottom, pipeX + pipeWidth, 1f)

            if (birdY <= 0f || birdY >= 1f || birdRect.overlaps(topPipeRect) || birdRect.overlaps(bottomPipeRect)) {
                running = false
                onLose(350L)
                break
            }

            val coinX = pipeX + pipeWidth / 2f
            val coinY = gapCenter
            val coinRect = Rect(coinX - 0.02f, coinY - 0.02f, coinX + 0.02f, coinY + 0.02f)
            if (!coinAlreadyScored && birdRect.overlaps(coinRect)) {
                coinAlreadyScored = true
                coinsCollected += 1
                onWin(25L + currentStreak * 3L)
            }

            if (!pipeAlreadyScored && pipeX + pipeWidth < birdX) {
                pipeAlreadyScored = true
                pipesCleared += 1
                currentStreak += 1
                onWin(400L * pipesCleared)
                if (currentStreak >= 3) {
                    onWoohoo()
                    showWoohoo = true
                    woohooAlpha.snapTo(1f)
                    woohooScale.snapTo(0.8f)
                    woohooScale.animateTo(1.12f, tween(230, easing = FastOutSlowInEasing))
                    woohooScale.animateTo(1f, tween(160, easing = FastOutSlowInEasing))
                    woohooAlpha.animateTo(0f, tween(620, easing = FastOutSlowInEasing))
                    showWoohoo = false
                    currentStreak = 0
                }
            }

            if (pipeX < -pipeWidth) {
                pipeX = 1.2f
                gapCenter = Random.nextFloat() * 0.44f + 0.28f
                pipeAlreadyScored = false
                coinAlreadyScored = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Flappy Coins", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text(
            "Coins $coinsCollected  |  Pipes $pipesCleared  |  Lane ${index % 4 + 1}",
            color = Color.White.copy(alpha = 0.8f),
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
                            birdVelocity = flapForce
                            pipeX = 1.2f
                            gapCenter = 0.5f
                            pipesCleared = 0
                            coinsCollected = 0
                            currentStreak = 0
                            pipeAlreadyScored = false
                            coinAlreadyScored = false
                        } else {
                            birdVelocity = flapForce
                        }
                    }
                },
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                val pipeLeft = pipeX * w
                val pipeW = pipeWidth * w
                val gapTopPx = (gapCenter - gapHeight / 2f) * h
                val gapBottomPx = (gapCenter + gapHeight / 2f) * h
                drawRect(color = Color(0xFF5B21B6), topLeft = Offset(pipeLeft, 0f), size = androidx.compose.ui.geometry.Size(pipeW, gapTopPx))
                drawRect(color = Color(0xFF5B21B6), topLeft = Offset(pipeLeft, gapBottomPx), size = androidx.compose.ui.geometry.Size(pipeW, h - gapBottomPx))

                val coinX = (pipeX + pipeWidth / 2f) * w
                val coinY = gapCenter * h
                if (!coinAlreadyScored) {
                    drawCircle(color = Color(0xFFFFD700), radius = 7f, center = Offset(coinX, coinY))
                }
                drawCircle(color = Color(0xFFFFD700), radius = 14f, center = Offset(birdX * w, birdY * h))
            }

            if (!running) {
                Text("Tap to restart", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.Center))
            }

            AnimatedVisibility(visible = showWoohoo, modifier = Modifier.align(Alignment.Center)) {
                Text(
                    "Woohoo! 🎉",
                    color = Color.White,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.alpha(woohooAlpha.value).scale(woohooScale.value),
                )
            }
        }
    }
}