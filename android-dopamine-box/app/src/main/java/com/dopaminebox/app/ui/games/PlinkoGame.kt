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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random

@Composable
fun PlinkoGame(
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
) {
    val rows = 8
    val ballX = remember { Animatable(0.5f) }
    val ballY = remember { Animatable(0f) }
    var selectedBucket by remember { mutableIntStateOf(-1) }
    var bet by remember { mutableIntStateOf(300) }
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current

    val buckets = remember {
        listOf(
            Bucket(2.0f, Color(0xFF22C55E)),
            Bucket(0.5f, Color(0xFFEF4444)),
            Bucket(1.0f, Color(0xFFEAB308)),
            Bucket(3.0f, Color(0xFF3B82F6)),
            Bucket(10.0f, Color(0xFFA855F7)),
        )
    }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(text = "Plinko", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text(text = "Bet: $${String.format("%,d", bet)}", color = Color.White.copy(alpha = 0.9f), fontWeight = FontWeight.Medium)

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0xFF2E1065))
                .border(1.dp, Color.White.copy(alpha = 0.16f), RoundedCornerShape(18.dp)),
        ) {
            val pegRadius = with(density) { 5.dp.toPx() }
            val ballRadius = with(density) { 9.dp.toPx() }
            val boardTop = with(density) { 20.dp.toPx() }
            val boardBottom = size.height - with(density) { 48.dp.toPx() }
            val rowHeight = (boardBottom - boardTop) / rows
            val spacing = size.width / (rows + 2f)

            // Render triangular peg grid with alternating row offsets.
            for (row in 0 until rows) {
                val cols = row + 3
                val rowY = boardTop + row * rowHeight
                val offset = if (row % 2 == 0) spacing * 0.5f else spacing
                for (col in 0 until cols) {
                    val x = offset + col * spacing
                    if (x in 0f..size.width) {
                        drawCircle(color = Color(0xFF22D3EE), radius = pegRadius, center = Offset(x, rowY))
                    }
                }
            }

            val bucketHeight = with(density) { 42.dp.toPx() }
            val bucketWidth = size.width / buckets.size
            buckets.forEachIndexed { idx, bucket ->
                val left = idx * bucketWidth
                val top = size.height - bucketHeight
                drawRoundRect(
                    color = bucket.color.copy(alpha = if (selectedBucket == idx) 0.95f else 0.65f),
                    topLeft = Offset(left + 2f, top),
                    size = androidx.compose.ui.geometry.Size(bucketWidth - 4f, bucketHeight - 2f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(16f, 16f),
                )
            }

            val currentX = ballX.value * size.width
            val currentY = boardTop + ballY.value * (boardBottom - boardTop)
            drawCircle(color = Color(0xFFFFD700), radius = ballRadius, center = Offset(currentX, currentY))
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            buckets.forEachIndexed { idx, bucket ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth(1f / buckets.size)
                        .height(32.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(bucket.color.copy(alpha = if (idx == selectedBucket) 0.95f else 0.65f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(text = "${bucket.multiplier}x", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(30.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Brush.horizontalGradient(listOf(Color(0xFFFFD700), Color(0xFFF97316)))),
            contentAlignment = Alignment.Center,
        ) {
            Slider(
                value = bet.toFloat(),
                onValueChange = { bet = it.toInt().coerceIn(100, 12_000) },
                valueRange = 100f..12_000f,
                colors = SliderDefaults.colors(
                    thumbColor = Color.White,
                    activeTrackColor = Color.Transparent,
                    inactiveTrackColor = Color.Transparent,
                ),
            )
        }

        GradientDropButton {
            scope.launch {
                selectedBucket = -1
                ballX.snapTo(0.5f)
                ballY.snapTo(0f)
                val stepDelay = (120f / speedMultiplier.coerceAtLeast(0.6f)).toLong().coerceAtLeast(50L)
                val pegWidth = 1f / 8f
                var x = 0.5f

                // Sequential peg deflections create a visible path instead of teleporting.
                repeat(rows) { row ->
                    val deflect = if (Random.nextBoolean()) pegWidth * 0.5f else -pegWidth * 0.5f
                    x = (x + deflect).coerceIn(0.1f, 0.9f)
                    ballX.animateTo(x, animationSpec = tween(stepDelay.toInt(), easing = FastOutSlowInEasing))
                    ballY.animateTo((row + 1f) / rows.toFloat(), animationSpec = tween(stepDelay.toInt(), easing = FastOutSlowInEasing))
                    delay(stepDelay / 2)
                }

                selectedBucket = ((x * buckets.size).toInt()).coerceIn(0, buckets.lastIndex)
                val multiplier = buckets[selectedBucket].multiplier
                val payout = (bet * multiplier).toLong()
                if (multiplier >= 1f) {
                    onWin(payout)
                } else {
                    onLose((bet * (1f - multiplier)).toLong().coerceAtLeast(1L))
                }
            }
        }
    }
}

private data class Bucket(val multiplier: Float, val color: Color)

@Composable
private fun GradientDropButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.horizontalGradient(listOf(Color(0xFF7C3AED), Color(0xFF4F46E5))))
            .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(20.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = "DROP BALL", color = Color.White, fontWeight = FontWeight.Bold)
    }
}