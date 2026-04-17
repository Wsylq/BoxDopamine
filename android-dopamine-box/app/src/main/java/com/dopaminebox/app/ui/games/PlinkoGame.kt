package com.dopaminebox.app.ui.games

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.hypot
import kotlin.random.Random

@Composable
fun PlinkoGame(
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
) {
    val rows = 8
    val buckets = remember {
        listOf(
            Bucket(2f, Color(0xFF22C55E)),
            Bucket(0.5f, Color(0xFFEF4444)),
            Bucket(1f, Color(0xFFEAB308)),
            Bucket(3f, Color(0xFF3B82F6)),
            Bucket(10f, Color(0xFFA855F7)),
        )
    }
    var bet by remember { mutableIntStateOf(300) }
    var selectedBucket by remember { mutableIntStateOf(-1) }
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }

    var ballX by remember { mutableFloatStateOf(0f) }
    var ballY by remember { mutableFloatStateOf(0f) }
    var vx by remember { mutableFloatStateOf(0f) }
    var vy by remember { mutableFloatStateOf(0f) }
    var dropping by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(canvasSize) {
        if (canvasSize.width > 0 && ballX == 0f) {
            ballX = canvasSize.width / 2f
            ballY = 24f
        }
    }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Plinko", color = Color.White, fontSize = 22.sp)
        Text("Bet: $${String.format("%,d", bet)}", color = Color.White.copy(alpha = 0.85f))

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(Color(0xFF2E1065), RoundedCornerShape(18.dp))
                .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(18.dp))
                .padding(8.dp),
            onDraw = {
                canvasSize = IntSize(size.width.toInt(), size.height.toInt())
                val boardTop = 20f
                val bucketHeight = 42f
                val boardBottom = size.height - bucketHeight - 8f
                val pegRadius = 5f
                val ballRadius = 9f

                val pegs = buildPegs(size, rows, boardTop, boardBottom)
                pegs.forEach { peg ->
                    drawCircle(color = Color(0xFF22D3EE), radius = pegRadius, center = peg)
                }

                val bucketWidth = size.width / buckets.size
                buckets.forEachIndexed { i, b ->
                    drawRoundRect(
                        color = b.color.copy(alpha = if (selectedBucket == i) 0.95f else 0.65f),
                        topLeft = Offset(i * bucketWidth + 2f, size.height - bucketHeight),
                        size = Size(bucketWidth - 4f, bucketHeight - 2f),
                        cornerRadius = CornerRadius(14f, 14f),
                    )
                }

                drawCircle(color = Color(0xFFFFD700), radius = ballRadius, center = Offset(ballX, ballY))
            },
        )

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            buckets.forEachIndexed { i, b ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth(1f / buckets.size)
                        .height(30.dp)
                        .background(b.color.copy(alpha = if (selectedBucket == i) 0.95f else 0.7f), RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("${b.multiplier}x", color = Color.White)
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(32.dp)
                .background(Brush.horizontalGradient(listOf(Color(0xFFFFD700), Color(0xFFF97316))), RoundedCornerShape(16.dp))
                .padding(horizontal = 8.dp),
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

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .background(Brush.horizontalGradient(listOf(Color(0xFF7C3AED), Color(0xFF4F46E5))), RoundedCornerShape(20.dp))
                .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(20.dp))
                .clickable(enabled = !dropping) {
                    if (canvasSize.width == 0) return@clickable
                    scope.launch {
                        dropping = true
                        selectedBucket = -1
                        val width = canvasSize.width.toFloat()
                        val height = canvasSize.height.toFloat()
                        val boardTop = 20f
                        val bucketHeight = 42f
                        val boardBottom = height - bucketHeight - 8f
                        val gravity = 980f
                        val dt = 0.016f * (1.2f / speedMultiplier.coerceAtLeast(0.8f))
                        val pegRadius = 5f
                        val ballRadius = 9f
                        val damping = 0.72f
                        val pegs = buildPegs(Size(width, height), rows, boardTop, boardBottom)

                        ballX = width / 2f
                        ballY = boardTop
                        vx = Random.nextFloat() * 120f - 60f
                        vy = 0f

                        while (ballY < boardBottom) {
                            vy += gravity * dt
                            vy = vy.coerceIn(-900f, 1200f)
                            ballX += vx * dt
                            ballY += vy * dt

                            if (ballX <= ballRadius || ballX >= width - ballRadius) {
                                vx = -vx * damping
                                ballX = ballX.coerceIn(ballRadius, width - ballRadius)
                            }

                            pegs.forEach { peg ->
                                val dx = ballX - peg.x
                                val dy = ballY - peg.y
                                val distance = hypot(dx.toDouble(), dy.toDouble()).toFloat().coerceAtLeast(0.001f)
                                val minDist = pegRadius + ballRadius
                                if (distance < minDist) {
                                    val nx = dx / distance
                                    val ny = dy / distance
                                    val dot = vx * nx + vy * ny
                                    vx = (vx - 2f * dot * nx) * damping
                                    vy = (vy - 2f * dot * ny) * damping
                                    val push = minDist - distance
                                    ballX += nx * push
                                    ballY += ny * push
                                }
                            }

                            delay(16)
                        }

                        selectedBucket = ((ballX / width) * buckets.size).toInt().coerceIn(0, buckets.lastIndex)
                        val multiplier = buckets[selectedBucket].multiplier
                        val payout = (bet * multiplier).toLong()
                        if (multiplier >= 1f) onWin(payout) else onLose((bet * (1f - multiplier)).toLong().coerceAtLeast(1L))
                        dropping = false
                    }
                },
            contentAlignment = Alignment.Center,
        ) {
            Text(if (dropping) "DROPPING..." else "DROP BALL", color = Color.White)
        }
    }
}

private data class Bucket(val multiplier: Float, val color: Color)

private fun buildPegs(size: Size, rows: Int, top: Float, bottom: Float): List<Offset> {
    val rowHeight = (bottom - top) / rows
    val spacing = size.width / (rows + 2f)
    val pegs = mutableListOf<Offset>()
    for (row in 0 until rows) {
        val cols = row + 3
        val y = top + row * rowHeight
        val offset = if (row % 2 == 0) spacing * 0.5f else spacing
        for (col in 0 until cols) {
            val x = offset + col * spacing
            if (x in 0f..size.width) pegs += Offset(x, y)
        }
    }
    return pegs
}