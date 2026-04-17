package com.dopaminebox.app.ui.games

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationVector1D
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
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
    var cardSuit by remember { mutableStateOf(randomSuit()) }
    var bet by remember { mutableIntStateOf(250) }
    var showDouble by remember { mutableStateOf(false) }
    var borderPulse by remember { mutableFloatStateOf(0f) }
    val shake = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(text = "Higher / Lower", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text(text = "Bet: $${String.format("%,d", bet)}", color = Color.White.copy(alpha = 0.9f), fontWeight = FontWeight.SemiBold)

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            AnimatedContent(
                targetState = Pair(currentCard, cardSuit),
                transitionSpec = {
                    slideInHorizontally(
                        animationSpec = tween(400, easing = FastOutSlowInEasing),
                        initialOffsetX = { fullWidth: Int -> fullWidth },
                    ) togetherWith androidx.compose.animation.fadeOut(tween(250))
                },
                label = "card-reveal",
            ) { state ->
                CardFace(
                    number = state.first,
                    suit = state.second,
                    pulse = borderPulse,
                    shakeX = shake.value,
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(30.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Brush.horizontalGradient(listOf(Color(0xFFFFD700), Color(0xFFF97316)))),
            contentAlignment = Alignment.Center,
        ) {
            Slider(
                value = bet.toFloat(),
                onValueChange = { bet = it.toInt().coerceIn(100, 15_000) },
                valueRange = 100f..15_000f,
                colors = SliderDefaults.colors(
                    thumbColor = Color.White,
                    activeTrackColor = Color.Transparent,
                    inactiveTrackColor = Color.Transparent,
                ),
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            GradientButton("HIGHER ⬆", true, Modifier.fillMaxWidth()) {
                playRound(
                    wantsHigher = true,
                    current = currentCard,
                    onResult = { won, next, suit ->
                        currentCard = next
                        cardSuit = suit
                        handleRoundResult(
                            won = won,
                            bet = bet,
                            onWin = onWin,
                            onLose = onLose,
                            setShowDouble = { showDouble = it },
                            onPulse = { borderPulse = it },
                            shake = shake,
                            scope = scope,
                        )
                    },
                )
            }
            GradientButton("LOWER ⬇", false, Modifier.fillMaxWidth()) {
                playRound(
                    wantsHigher = false,
                    current = currentCard,
                    onResult = { won, next, suit ->
                        currentCard = next
                        cardSuit = suit
                        handleRoundResult(
                            won = won,
                            bet = bet,
                            onWin = onWin,
                            onLose = onLose,
                            setShowDouble = { showDouble = it },
                            onPulse = { borderPulse = it },
                            shake = shake,
                            scope = scope,
                        )
                    },
                )
            }
        }

        if (showDouble) {
            val pulse = rememberInfiniteTransition(label = "double-pulse")
            val scale by pulse.animateFloat(
                initialValue = 1f,
                targetValue = 1.08f,
                animationSpec = infiniteRepeatable(
                    animation = tween(450, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse,
                ),
                label = "double-scale",
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .scale(scale),
            ) {
                GradientButton("DOUBLE IT? 🔥", true, Modifier.fillMaxWidth()) {
                    showDouble = false
                    val next = Random.nextInt(1, 14)
                    val wonDouble = next > currentCard
                    currentCard = next
                    cardSuit = randomSuit()
                    if (wonDouble) {
                        onWin((bet * 4L))
                    } else {
                        onLose((bet * 2L))
                    }
                }
            }

            LaunchedEffect(showDouble) {
                delay(3000)
                showDouble = false
            }
        }

        Text(
            text = "Speed x${"%.1f".format(speedMultiplier)}",
            color = Color.White.copy(alpha = 0.75f),
            fontSize = 14.sp,
        )
    }
}

@Composable
private fun CardFace(number: Int, suit: String, pulse: Float, shakeX: Float) {
    val borderColor = if (pulse > 0.01f) Color(0xFF22C55E).copy(alpha = 0.4f + (0.6f * pulse)) else Color.White.copy(alpha = 0.2f)
    Box(
        modifier = Modifier
            .size(width = 210.dp, height = 280.dp)
            .offset { IntOffset(shakeX.roundToInt(), 0) }
            .clip(RoundedCornerShape(20.dp))
            .background(Color.White)
            .border(4.dp, borderColor, RoundedCornerShape(20.dp))
            .padding(14.dp),
    ) {
        Text(text = suit, fontSize = 24.sp, color = Color(0xFF1F2937), fontWeight = FontWeight.Bold)
        Text(
            text = number.toString(),
            fontSize = 72.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color(0xFF111827),
            modifier = Modifier.align(Alignment.Center),
        )
        Text(text = suit, fontSize = 24.sp, color = Color(0xFF1F2937), fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.BottomEnd))
    }
}

private fun playRound(
    wantsHigher: Boolean,
    current: Int,
    onResult: (Boolean, Int, String) -> Unit,
) {
    val next = Random.nextInt(1, 14)
    val won = if (wantsHigher) next > current else next < current
    onResult(won, next, randomSuit())
}

private fun handleRoundResult(
    won: Boolean,
    bet: Int,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
    setShowDouble: (Boolean) -> Unit,
    onPulse: (Float) -> Unit,
    shake: Animatable<Float, AnimationVector1D>,
    scope: kotlinx.coroutines.CoroutineScope,
) {
    if (won) {
        onWin((bet * 2L))
        setShowDouble(true)
        scope.launch {
            repeat(3) {
                onPulse(1f)
                delay(130)
                onPulse(0f)
                delay(120)
            }
        }
    } else {
        setShowDouble(false)
        onLose(bet.toLong())
        scope.launch {
            repeat(3) {
                shake.animateTo(12f, animationSpec = tween(80, easing = FastOutSlowInEasing))
                shake.animateTo(-12f, animationSpec = tween(80, easing = FastOutSlowInEasing))
            }
            shake.animateTo(0f, animationSpec = tween(80, easing = FastOutSlowInEasing))
        }
    }
}

private fun randomSuit(): String = listOf("♠", "♥", "♦", "♣").random()

@Composable
private fun GradientButton(label: String, primary: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .height(56.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.horizontalGradient(
                    if (primary) listOf(Color(0xFFFFD700), Color(0xFFF97316))
                    else listOf(Color(0xFF7C3AED), Color(0xFF4F46E5))
                )
            )
            .border(1.dp, Color.White.copy(alpha = 0.22f), RoundedCornerShape(20.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = label, color = Color.White, fontWeight = FontWeight.Bold)
    }
}