package com.dopaminebox.app.ui.games

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import kotlin.random.Random

@Composable
fun HigherLowerGame(
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
) {
    var currentCard by remember { mutableIntStateOf(Random.nextInt(1, 14)) }
    var currentSuit by remember { mutableStateOf(randomSuit()) }
    var bet by remember { mutableIntStateOf(250) }
    var pulseBorder by remember { mutableFloatStateOf(0f) }
    var showDouble by remember { mutableStateOf(false) }
    val shakeX = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()

    fun executeRound(wantsHigher: Boolean) {
        val next = Random.nextInt(1, 14)
        val won = if (wantsHigher) next > currentCard else next < currentCard
        currentCard = next
        currentSuit = randomSuit()
        if (won) {
            val reward = (bet * 2L)
            onWin(reward)
            showDouble = true
            scope.launch {
                repeat(3) {
                    pulseBorder = 1f
                    delay(90)
                    pulseBorder = 0f
                    delay(90)
                }
            }
        } else {
            showDouble = false
            onLose(bet.toLong())
            scope.launch {
                repeat(3) {
                    shakeX.animateTo(12f, tween(80, easing = FastOutSlowInEasing))
                    shakeX.animateTo(-12f, tween(80, easing = FastOutSlowInEasing))
                }
                shakeX.animateTo(0f, tween(80, easing = FastOutSlowInEasing))
            }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize()) {
        Text("Higher / Lower", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text("Bet: $${String.format("%,d", bet)}", color = Color.White.copy(alpha = 0.85f))

        AnimatedContent(
            targetState = currentCard to currentSuit,
            transitionSpec = {
                slideInHorizontally(
                    animationSpec = tween(400, easing = FastOutSlowInEasing),
                    initialOffsetX = { fullWidth: Int -> fullWidth },
                ) togetherWith androidx.compose.animation.fadeOut(tween(250))
            },
            label = "card-slide",
            modifier = Modifier.align(Alignment.CenterHorizontally),
        ) { state ->
            PlayingCard(
                number = state.first,
                suit = state.second,
                pulse = pulseBorder,
                shake = shakeX.value,
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(32.dp)
                .background(Brush.horizontalGradient(listOf(Color(0xFFFFD700), Color(0xFFF97316))), RoundedCornerShape(18.dp))
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

        ActionButton("HIGHER ⬆", primary = true) { executeRound(true) }
        ActionButton("LOWER ⬇", primary = false) { executeRound(false) }

        if (showDouble) {
            val pulse = rememberInfiniteTransition(label = "double")
            val s by pulse.animateFloat(
                initialValue = 1f,
                targetValue = 1.06f,
                animationSpec = infiniteRepeatable(tween(500), RepeatMode.Reverse),
                label = "double-scale",
            )
            ActionButton("DOUBLE IT? 🔥", primary = true, modifier = Modifier.scale(s)) {
                showDouble = false
                val won = Random.nextFloat() < 0.45f
                if (won) onWin(bet * 3L) else onLose(bet * 2L)
            }
            LaunchedEffect(showDouble) {
                delay(3000)
                showDouble = false
            }
        }

        Text("Speed x${"%.1f".format(speedMultiplier)}", color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp)
    }
}

@Composable
private fun PlayingCard(number: Int, suit: String, pulse: Float, shake: Float) {
    val borderColor = if (pulse > 0.01f) Color(0xFF22C55E) else Color.White.copy(alpha = 0.25f)
    Box(
        modifier = Modifier
            .size(width = 210.dp, height = 280.dp)
            .offset { IntOffset(shake.roundToInt(), 0) }
            .background(Color.White, RoundedCornerShape(20.dp))
            .border(4.dp, borderColor, RoundedCornerShape(20.dp))
            .padding(14.dp),
    ) {
        Text(suit, color = Color(0xFF1F2937), fontWeight = FontWeight.Bold, fontSize = 24.sp)
        Text(
            number.toString(),
            color = Color(0xFF111827),
            fontSize = 72.sp,
            fontWeight = FontWeight.ExtraBold,
            modifier = Modifier.align(Alignment.Center),
        )
        Text(suit, color = Color(0xFF1F2937), fontWeight = FontWeight.Bold, fontSize = 24.sp, modifier = Modifier.align(Alignment.BottomEnd))
    }
}

private fun randomSuit(): String = listOf("♠", "♥", "♦", "♣").random()

@Composable
private fun ActionButton(
    label: String,
    primary: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(
                Brush.horizontalGradient(
                    if (primary) listOf(Color(0xFFFFD700), Color(0xFFF97316)) else listOf(Color(0xFF7C3AED), Color(0xFF4F46E5)),
                ),
                RoundedCornerShape(20.dp),
            )
            .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(20.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = Color.White, fontWeight = FontWeight.Bold)
    }
}